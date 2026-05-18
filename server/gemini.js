const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('./db/database');

/**
 * getApiKey - Retrieves the Gemini API key for a specific tenant,
 * falling back to the default clinic ID if necessary.
 */
const getApiKey = async (tenantId) => {
    try {
        const query = db.isPg 
            ? "SELECT value FROM settings WHERE key = 'gemini_api_key' AND (tenant_id::text = ? OR tenant_id::text = 'default-clinic-id') ORDER BY CASE WHEN tenant_id::text = ? THEN 1 ELSE 2 END ASC LIMIT 1"
            : "SELECT value FROM settings WHERE key = 'gemini_api_key' AND (tenant_id = ? OR tenant_id = 'default-clinic-id') ORDER BY tenant_id DESC LIMIT 1";
        
        const params = db.isPg ? [tenantId, tenantId] : [tenantId];
        const row = await db.get(query, params);
        
        if (row && row.value) {
            return row.value.trim();
        }
        return '';
    } catch (err) {
        console.error("[Gemini] Error fetching API key:", err.message);
        return '';
    }
};

/**
 * generateQuestions - Generates follow-up clinical questions based on patient complaint.
 * PRIORITIZES local templates over AI to ensure high reliability.
 */
const generateQuestions = async (complaint, language = 'en', tenantId) => {
    // 1. MATCH LOCAL TEMPLATES
    const query = db.isPg 
        ? "SELECT * FROM templates WHERE tenant_id::text = ? OR tenant_id::text = 'default-clinic-id'"
        : "SELECT * FROM templates WHERE tenant_id = ? OR tenant_id = 'default-clinic-id'";
    const templates = await db.all(query, [tenantId]);
    const lowerComplaint = (complaint || '').toLowerCase();
    
    // Improved matching logic
    let matchedTemplates = templates.filter(t => {
        const keywords = (t.trigger_keywords || '').split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
        return keywords.some(k => {
            const escapedK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(^|\\P{L})${escapedK}(\\P{L}|$)`, 'iu');
            return regex.test(lowerComplaint);
        });
    });

    const allTemplateQuestions = [];
    const seenQs = new Set();
    for (const t of matchedTemplates) {
        try {
            let parsedQs = JSON.parse(t.questions || '[]');
            const localizedQs = (Array.isArray(parsedQs) ? parsedQs : [parsedQs]).map(q => 
                typeof q === 'string' ? q : (q[language] || q.en || '')
            ).filter(q => q.trim().length > 0);

            for (const q of localizedQs) {
                if (!seenQs.has(q.toLowerCase())) {
                    allTemplateQuestions.push(q);
                    seenQs.add(q.toLowerCase());
                }
            }
        } catch (e) { console.error(`[Templates] Error parsing ${t.name}:`, e); }
    }

    // IF WE HAVE TEMPLATES, USE THEM (User's specific "intelligence" requirement)
    if (allTemplateQuestions.length > 0) {
        console.log(`[AI] Using ${allTemplateQuestions.length} questions from local templates.`);
        return allTemplateQuestions;
    }

    // 2. FALLBACK TO AI IF NO TEMPLATES
    const apiKey = await getApiKey(tenantId);
    if (!apiKey) return getGenericQuestions(language);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const targetLang = { 'en': 'English', 'hi': 'Hindi', 'bn': 'Bengali' }[language] || 'English';
        
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: "You are a Professional Medical Intake Assistant. Your goal is to collect a focused, medically-relevant history from a patient. Response MUST be a JSON array of 5-8 strings in the requested language script."
        });

        const prompt = `Patient complaint: "${complaint}". Language: ${targetLang}. Generate follow-up questions following SOCRATES/OPQRST framework.`;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        const jsonText = responseText.includes('[') ? responseText.substring(responseText.indexOf('['), responseText.lastIndexOf(']') + 1) : responseText;
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("[AI] Question generation failed:", e.message);
        return getGenericQuestions(language);
    }
};

/**
 * generateSummary - Creates a structured clinical summary from QA transcript and uploaded documents.
 * USES native JSON mode for maximum reliability.
 */
const generateSummary = async (patient, complaint, qaPairs, documents, language = 'en', tenantId) => {
    const apiKey = await getApiKey(tenantId);
    if (!apiKey) return getManualSummaryFallback(patient, complaint, qaPairs, documents);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: "You are a Clinical Scribe. Summarize patient encounters into professional medical English history. Output MUST be valid JSON adhering strictly to the provided schema."
        });

        const transcript = qaPairs.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n');
        const docsContext = documents.map(d => `Document "${d.filename}": ${d.coordinator_note}`).join('\n');

        const prompt = `Summarize encounter for ${patient.name} (${patient.age}y, ${patient.gender}). 
Chief Complaint: ${complaint}
Transcript: 
${transcript}
Record Findings:
${docsContext}

JSON Schema:
{
  "chief_complaint": "string",
  "history_of_presenting_illness": "professional medical English prose",
  "key_findings": ["item1", "item2"],
  "clinical_flags": ["alert1", "alert2"],
  "assessment_notes": "string",
  "suggested_medications": "markdown list or string",
  "suggested_tests": "markdown list or string"
}`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        return JSON.parse(result.response.text());
    } catch (e) {
        console.error("[AI] Summary generation failed:", e.message);
        return getManualSummaryFallback(patient, complaint, qaPairs, documents);
    }
};

/**
 * generateDocumentNote - Creates a note for a specific medical document.
 */
const generateDocumentNote = async (filename, description, language = 'en', tenantId) => {
    const apiKey = await getApiKey(tenantId);
    if (!apiKey) return `Record: ${filename}. Context: ${description}`;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: "Translate medical record descriptions into professional clinical notes in English."
        });

        const result = await model.generateContent(`Document: "${filename}". Native Description: "${description}".`);
        return result.response.text();
    } catch (e) {
        return `Record: ${filename}. Note: ${description}`;
    }
};

const getGenericQuestions = (language) => {
    const genericFallbacks = {
        'en': ["When did this start?", "How severe is it (1-10)?", "What makes it better/worse?", "Any other associated symptoms?", "Have you had this before?"],
        'hi': ["यह कब शुरू हुआ?", "यह कितना गंभीर है (1-10)?", "क्या इसे कम या ज्यादा करता है?", "कोई अन्य संबंधित लक्षण?", "क्या यह पहले हुआ है?"],
        'bn': ["এটি কখন শুরু হয়েছিল?", "এটি কতটা গুরুতর (১-১০)?", "কী করলে ভাল বা খারাপ হয়?", "অন্য কোনো লক্ষণ আছে কি?", "আগে কি এমন হয়েছে?"]
    };
    return genericFallbacks[language] || genericFallbacks['en'];
};

const getManualSummaryFallback = (patient, complaint, qaPairs, documents) => {
    const hpi = qaPairs.map(qa => `• ${qa.question}: ${qa.answer}`).join('\n') || "No transcript available.";
    return {
        chief_complaint: complaint,
        history_of_presenting_illness: hpi,
        key_findings: documents.map(d => d.coordinator_note || d.filename).filter(n => n),
        clinical_flags: ["Manual Assessment Required"],
        assessment_notes: "AI synthesis failed. Manual history provided.",
        suggested_medications: "ToBeVerified",
        suggested_tests: "ToBeVerified"
    };
};

module.exports = { generateQuestions, generateSummary, generateDocumentNote };
