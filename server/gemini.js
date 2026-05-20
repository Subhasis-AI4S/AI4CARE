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
        
        const key = (row && row.value) ? row.value.trim() : '';

        if (key) {
            console.log(`[AI] Using API key from Settings dashboard (ending in ...${key.slice(-4)})`);
        } else {
            console.error(`[AI] No API key found in Settings for tenant ${tenantId}. Please go to Settings and enter your Gemini API Key.`);
        }
        
        return key;
    } catch (err) {
        console.error("[Gemini] Error fetching API key from DB:", err.message);
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
    
    // Improved matching logic with strict language partitioning
    // 1. Filter and Score Templates
    let scoredTemplates = templates.map(t => {
        const tName = (t.name || '').toUpperCase();
        const targetLangUpper = (language || 'en').toUpperCase();
        
        let templateLang = 'EN'; 
        if (tName.includes('(BN)')) {
            templateLang = 'BN';
        } else if (tName.includes('(HI)')) {
            templateLang = 'HI';
        }

        const normalizedTargetLang = targetLangUpper === 'BENGALI' ? 'BN' : 
                                     targetLangUpper === 'HINDI' ? 'HI' : 
                                     targetLangUpper === 'EN' ? 'EN' : 
                                     targetLangUpper.substring(0, 2);

        if (templateLang !== normalizedTargetLang) return { score: 0 };

        const keywords = (t.trigger_keywords || '').split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
        let score = 0;
        keywords.forEach(k => {
            const escapedK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(^|\\P{L})${escapedK}(\\P{L}|$)`, 'iu');
            if (regex.test(lowerComplaint)) {
                score += k.length; // Priority to longer, more specific keywords
            }
        });

        return { ...t, score };
    }).filter(t => t.score > 0)
      .sort((a, b) => b.score - a.score);

    // 2. Pick the BEST single template match
    const bestTemplate = scoredTemplates[0];

    if (bestTemplate) {
        console.log(`[AI] Template match: "${bestTemplate.name}" (Score: ${bestTemplate.score})`);
        try {
            let rawQs = bestTemplate.questions || '[]';
            let parsedQs = typeof rawQs === 'string' ? JSON.parse(rawQs) : rawQs;
            
            const questions = (Array.isArray(parsedQs) ? parsedQs : [parsedQs]).map(q => {
                if (typeof q === 'string') return q;
                return q[language] || q.en || '';
            }).filter(q => q.trim().length > 0);

            return questions;
        } catch (e) { 
            console.error(`[Templates] Error parsing ${bestTemplate.name}:`, e); 
        }
    }

    // 2. FALLBACK TO AI IF NO TEMPLATES
    const apiKey = await getApiKey(tenantId);
    if (!apiKey) return getGenericQuestions(language);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash"
        });

        const prompt = `You are a clinical assistant. Given a patient's complaint: "${complaint}", generate 6 targeted clinical follow-up questions in ${language}. Keep them short. Output as JSON array of strings.`;
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        const jsonText = responseText.includes('[') ? responseText.substring(responseText.indexOf('['), responseText.lastIndexOf(']') + 1) : responseText;
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("[AI] Generator Error (Questions):", e.message);
        if (e.message.includes('404')) {
            console.error("[AI] 404 Suggestion: Ensure 'Generative Language API' is enabled in your Google Cloud Project for this key.");
        }
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
            model: "gemini-1.5-flash" 
        });

        const transcript = qaPairs.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n');
        const docsContext = documents.map(d => `Document "${d.filename}": ${d.coordinator_note}`).join('\n');

        const prompt = `You are a Clinical Associate analyzing an encounter for ${patient.name} (${patient.age}y, ${patient.gender}).
Based on the transcript and record findings provided below, synthesize a high-quality clinical note.

CRITICAL REQUIREMENTS:
- Use the Q&A transcript to build the 'history_of_complaint'.
- Analyze the complaint and transcript to suggest 2-3 most relevant medications AND 2-3 diagnostic tests.
- DO NOT leave suggested_medications/suggested_tests empty if the case warrants them.
- Output MUST be valid JSON in the specified schema.

Chief Complaint: ${complaint}
Transcript: 
${transcript}
Record Findings:
${docsContext}

JSON Schema:
{
  "chief_complaint": "string",
  "history_of_complaint": "professional medical English prose synthesized from the transcript (LIMIT TO 3 PARAGRAPHS)",
  "key_findings": ["item1", "item2"],
  "clinical_flags": ["alert1", "alert2"],
  "assessment_notes": "clinical assessment based on analysis",
  "suggested_medications": "markdown list of 2-3 suggested medications",
  "suggested_tests": "markdown list of 2-3 suggested diagnostic tests"
}`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        return JSON.parse(result.response.text());
    } catch (e) {
        console.error("[AI] Generator Error (Summary):", e.message);
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
            model: "gemini-1.5-flash"
        });

        const result = await model.generateContent(`Translate/Summarize medical record. Document: "${filename}". Native Description: "${description}". Output professional clinical note in English.`);
        return result.response.text();
    } catch (e) {
        console.error("[AI] Document Analysis Error:", e.message);
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
