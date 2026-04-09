const { GoogleGenAI } = require('@google/genai');
const db = require('./db/database');

const getApiKey = async (tenantId) => {
    try {
        const row = await db.get("SELECT value FROM settings WHERE key = 'gemini_api_key' AND (tenant_id = ? OR tenant_id = 'default-clinic-id') ORDER BY tenant_id DESC", [tenantId]);
        return row ? row.value : '';
    } catch (err) {
        return '';
    }
};

const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
];

const getTemplatesContext = async (complaint, tenantId) => {
    try {
        const templates = await db.all('SELECT * FROM templates WHERE tenant_id = ? OR tenant_id = "default-clinic-id"', [tenantId]);
        if (!templates || templates.length === 0) return '';
        
        const lowerComplaint = complaint.toLowerCase();
        const matchedTemplates = templates.filter(t => {
            const keywords = t.trigger_keywords ? t.trigger_keywords.split(',').map(k => k.trim().toLowerCase()) : [];
            return keywords.some(k => lowerComplaint.includes(k));
        });
        
        if (matchedTemplates.length === 0) return '';
        
        let context = 'Standard follow-up inspiration for related symptoms:\n';
        matchedTemplates.forEach(t => {
            const qs = JSON.parse(t.questions || '[]');
            context += `- ${t.name}: ${qs.join(' ')}\n`;
        });
        return context;
    } catch (err) {
        return '';
    }
};

const generateQuestions = async (complaint, language = 'en', tenantId) => {
    const apiKey = await getApiKey(tenantId);
    const templatesContext = await getTemplatesContext(complaint, tenantId);
    
    if (!apiKey) {
        return generateQuestionsInternalFallback(complaint, language);
    }

    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
    
    const langNames = { 'en': 'English', 'hi': 'Hindi', 'bn': 'Bengali' };
    const targetLang = langNames[language] || 'English';

    const systemPrompt = `You are a highly professional Clinical Intake Assistant. Your goal is to help a physician collect a focused medical history.
Patient Complaint: ${complaint}
${templatesContext ? '\n' + templatesContext : ''}

STRICT GUIDELINES:
1. Generate exactly 6 professional, medically-relevant follow-up questions.
2. The questions MUST be written in ${targetLang} (${language}) native script.
3. IMPORTANT: The patient input might be written in Roman-script transliteration (e.g., "mujhe bukhar he" for Hindi or "amar jor hoyeche" for Bengali). You must correctly identify the medical intent and the language, then respond in the native script of ${targetLang}.
4. Use clinical terminology appropriately (e.g., onset, character, radiation, relieving factors) following the SOCRATES or OPQRST framework.
5. Questions MUST be professional, objective, and empathetic. No diagnostics.
6. ABSOLUTELY PROHIBITED: Any sexually explicit, offensive, nonsensical, or unprofessional language.
7. Return the questions as a JSON array of strings in ${targetLang}. Do not include any other text or markdown formatting.`;

    try {
        console.log(`--- Gemini Question Generation Started for Tenant: ${tenantId} ---`);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: systemPrompt,
            config: {
                safetySettings: safetySettings
            }
        });
        
        let text = response.text || '';
        if (!text && response.outputs && response.outputs[0]) {
             text = response.outputs[0].text;
        }
        
        if (!text) {
            throw new Error('Gemini returned an empty response.');
        }

        // Clean up markdown if it sneaked in
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const questions = JSON.parse(text);
        console.log(`Successfully generated ${questions.length} questions.`);
        return Array.isArray(questions) ? questions.map(q => ({ text: q, source: 'AI' })) : [];
    } catch (e) {
        console.error("Gemini API call failed:", e.message);
        console.log("Falling back to local templates...");
        return await generateQuestionsInternalFallback(complaint, language);
    }
};

const generateQuestionsInternalFallback = async (complaint, language = 'en') => {
    try {
        const templates = await db.all("SELECT * FROM templates");
        if (!templates) return getGenericQuestions(language);

        const lowerComplaint = complaint.toLowerCase();
        const matchedTemplate = templates.find(t => {
            const keywords = (t.trigger_keywords || '').split(',').map(k => k.trim().toLowerCase());
            return keywords.some(k => k && lowerComplaint.includes(k));
        });
        
        if (matchedTemplate) {
            try {
                console.log(`Using template: ${matchedTemplate.name}`);
                const qs = JSON.parse(matchedTemplate.questions);
                return qs.map(q => ({ text: q, source: 'Template' }));
            } catch (pe) {
                console.error("Error parsing template JSON:", pe);
            }
        }

        console.log("No specific template matched. Using generic follow-ups.");
        return getGenericQuestions(language).map(q => ({ text: q, source: 'Generic' }));
    } catch (err) {
        console.error("Database error during fallback:", err);
        return getGenericQuestions(language).map(q => ({ text: q, source: 'Generic' }));
    }
};

const getGenericQuestions = (language) => {
    // Generic localized follow-ups
    const genericFallbacks = {
        'en': [
            "When did this symptom first start?",
            "On a scale of 1-10, how severe is it?",
            "What makes the symptom better or worse?",
            "Have you experienced this before?",
            "Are you taking any medications for this?",
            "Are there any other associated symptoms?"
        ],
        'hi': [
            "यह लक्षण पहली बार कब शुरू हुआ?",
            "1-10 के पैमाने पर, यह कितना गंभीर है?",
            "किस चीज़ से लक्षण बेहतर या बदतर हो जाता है?",
            "क्या आपने पहले इसका अनुभव किया है?",
            "क्या आप इसके लिए कोई दवा ले रहे हैं?",
            "क्या कोई अन्य संबंधित लक्षण हैं?"
        ],
        'bn': [
            "এই লক্ষণটি প্রথম কবে শুরু হয়েছিল?",
            "১-১০ স্কেলে, এটি কতটা গুরুতর?",
            "কী করলে এই লক্ষণটি ভালো বা খারাপ হয়?",
            "আপনি কি আগে এটি অনুভব করেছেন?",
            "আপনি কি এর জন্য কোনো ওষুধ খাচ্ছেন?",
            "অন্য কোনো সংশ্লিষ্ট লক্ষণ আছে কি?"
        ]
    };
    return genericFallbacks[language] || genericFallbacks['en'];
};

const generateSummary = async (patient, complaint, qaPairs, documents, language = 'en', tenantId) => {
    const apiKey = await getApiKey(tenantId);
    
    if (!apiKey) {
        // ... fallback clinical summary logic ...
        const keyFindings = documents.map(d => `${d.filename}: ${d.coordinator_note}`);
        return {
            chief_complaint: complaint,
            history_of_presenting_illness: `Patient ${patient.name} (${patient.age}y ${patient.gender}) presents with: ${complaint}.\n\nFollow-up Details (Direct Intake):\n${qaPairs.map(qa => `- ${qa.question}: ${qa.answer}`).join('\n')}`,
            key_findings: keyFindings.length > 0 ? keyFindings : ["No records documented"],
            clinical_flags: ["Baseline Clinical Assessment Recommended"],
            assessment_notes: "This is an automated clinical summary synthesized from the intake interaction.",
            suggested_medications: "Please perform a manual clinical assessment for medication recommendations.",
            suggested_tests: "Consider baseline diagnostic tests if indicated by symptoms."
        };
    }

    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

    const langNames = { 'en': 'English', 'hi': 'Hindi', 'bn': 'Bengali' };
    const intakeLang = langNames[language] || 'English';

    // Format inputs
    const qaPairsText = qaPairs.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n');
    const docsText = documents.map(d => `- [${d.filename}]: ${d.coordinator_note}`).join('\n');

    const systemPrompt = `You are a clinical documentation assistant. Based on the following patient intake information (provided in ${intakeLang}), write a structured consultation summary for the physician. 
Patient: ${patient.name}, Age: ${patient.age}, Gender: ${patient.gender}. 
Chief Complaint: ${complaint}. 
Follow-up Q&A: \n${qaPairsText}\n 
Uploaded documents: \n${docsText || 'None'}\n
 
NOTE: The input text might be in Roman-script transliteration (Hinglish/Benglish). You must analyze the meaning correctly.

Format your response as JSON with these exact keys: 
- chief_complaint (string)
- history_of_presenting_illness (detailed narrative)
- key_findings (bullet list as array of strings)
- clinical_flags (array of strings, empty if none)
- assessment_notes (brief professional summary)
- suggested_medications (string, evidence-based medication suggestions for the doctor to review)
- suggested_tests (string, recommended diagnostic tests or follow-ups)

CRITICAL: The final summary content should be ALWAYS in English (for standard medical records), regardless of the input script or language. Use high-level clinical vocabulary. Return only valid JSON.`;

    try {
        console.log(`--- Gemini Summary Generation Started for Tenant: ${tenantId} ---`);
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: systemPrompt,
            config: {
                responseMimeType: 'application/json',
                safetySettings: safetySettings
            }
        });
        
        const text = response.text || (response.outputs && response.outputs[0]?.text) || '{}';
        const summary = JSON.parse(text);
        console.log("Successfully generated AI summary.");
        return summary;
    } catch (e) {
        console.error("Gemini summary generation failed:", e.message);
        console.log("Falling back to local clinical summary...");
        return {
            chief_complaint: complaint,
            history_of_presenting_illness: `[Clinical Intake] Patient ${patient.name} (${patient.age}y ${patient.gender}) presents with: ${complaint}.\n\nFollow-up Details:\n${qaPairs.map(qa => `- ${qa.question}: ${qa.answer}`).join('\n')}`,
            key_findings: documents.map(d => `${d.filename}: ${d.coordinator_note}`),
            clinical_flags: ["Standard Intake Summary"],
            assessment_notes: "This summary was generated from the clinical intake portal."
        };
    }
};

const generateDocumentNote = async (filename, description, language = 'en', tenantId) => {
     const apiKey = await getApiKey(tenantId);
     if (!apiKey) {
         return `Attached document: ${filename}. Context: ${description}`;
     }

     const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
     const langNames = { 'en': 'English', 'hi': 'Hindi', 'bn': 'Bengali' };
     const contextLang = langNames[language] || 'English';

     const systemPrompt = `The coordinator has uploaded a patient document named "${filename}" and provided the following context (in ${contextLang}): "${description}". 
Write a very brief, professional one-sentence clinical note in English summarizing what this document is, suitable for a medical record.`;
    
     try {
         console.log(`--- Gemini Document Note Generation for: ${filename} ---`);
         const response = await ai.models.generateContent({
             model: "gemini-2.0-flash",
             contents: systemPrompt,
             config: {
                 safetySettings: safetySettings
             }
         });
         const note = (response.text || (response.outputs && response.outputs[0]?.text) || description).trim();
         console.log("Successfully generated document note.");
         return note;
     } catch (e) {
         console.error("Gemini document note failed:", e.message);
         return `Attached document: ${filename}. Note: ${description}`;
     }
};

module.exports = {
    generateQuestions,
    generateSummary,
    generateDocumentNote
};
