const { GoogleGenAI } = require('@google/genai');
const db = require('./db/database');

const getApiKey = async (tenantId) => {
    try {
        console.log(`[Gemini] Fetching API key for tenant: ${tenantId}`);
        // Add ::text casting for PG compatibility and safer comparison
        const query = db.isPg 
            ? "SELECT value FROM settings WHERE key = 'gemini_api_key' AND (tenant_id::text = ? OR tenant_id = 'default-clinic-id') ORDER BY CASE WHEN tenant_id::text = ? THEN 1 ELSE 2 END ASC LIMIT 1"
            : "SELECT value FROM settings WHERE key = 'gemini_api_key' AND (tenant_id = ? OR tenant_id = 'default-clinic-id') ORDER BY tenant_id DESC LIMIT 1";
        
        const params = db.isPg ? [tenantId, tenantId] : [tenantId];
        const row = await db.get(query, params);
        
        if (row && row.value) {
            console.log(`[Gemini] API Key found (length: ${row.value.length})`);
            return row.value;
        }
        console.warn(`[Gemini] No API Key found for tenant ${tenantId}. Fallback to templates/generic.`);
        return '';
    } catch (err) {
        console.error("[Gemini] Error fetching API key:", err.message);
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
    // 1. Try local templates FIRST for exact clinical matches
    const templates = await db.all("SELECT * FROM templates WHERE tenant_id = ? OR tenant_id = 'default-clinic-id'", [tenantId]);
    const lowerComplaint = (complaint || '').toLowerCase();
    
    const targetTags = {
        'en': ['(EN)', '-EN', ' EN'],
        'bn': ['(BN)', '-BN', ' BN'],
        'hi': ['(HI)', '-HI', ' HI']
    };

    const requestedLangTag = targetTags[language.toLowerCase()];
    const otherLangTags = Object.keys(targetTags)
        .filter(l => l !== language.toLowerCase())
        .flatMap(l => targetTags[l]);

    // 1. Gather Matching Templates
    let templateQuestions = [];
    const matchedTemplates = templates.filter(t => {
        const nameUpper = (t.name || '').toUpperCase();
        if (otherLangTags.some(tag => nameUpper.includes(tag))) return false;
        
        const keywords = (t.trigger_keywords || '').split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
        const cleanComplaint = lowerComplaint.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g," ");
        
        return keywords.some(k => {
            const regex = new RegExp(`\\b${k}\\b`, 'i');
            return regex.test(cleanComplaint) || k === lowerComplaint.trim();
        });
    });

    const matchedTemplate = matchedTemplates.find(t => {
        const nameUpper = (t.name || '').toUpperCase();
        return requestedLangTag.some(tag => nameUpper.includes(tag));
    }) || matchedTemplates[0];

    if (matchedTemplate) {
        try {
            console.log(`[Templates] Match found for enrichment: ${matchedTemplate.name}`);
            let rawQs = matchedTemplate.questions || '[]';
            let parsedQs = [];
            if (typeof rawQs !== 'string') parsedQs = Array.isArray(rawQs) ? rawQs : [rawQs];
            else if (rawQs.trim().startsWith('[') || rawQs.trim().startsWith('{')) parsedQs = JSON.parse(rawQs);
            else parsedQs = rawQs.split('\n').filter(q => q.trim().length > 0);
            
            templateQuestions = (Array.isArray(parsedQs) ? parsedQs : [parsedQs]).map(q => 
                typeof q === 'string' ? q : (q[language] || q.en || q.hi || q.bn || '')
            ).filter(q => q.trim().length > 0);
        } catch (e) {
            console.error("[Templates] Failure parsing template context:", e);
        }
    }

    // 2. Fall back to Gemini for enrichment or full generation
    const apiKey = await getApiKey(tenantId);
    if (!apiKey) {
        // No AI available -> Use templates if they exist, otherwise generic fallback
        if (templateQuestions.length > 0) {
            return templateQuestions.map(q => ({ text: q, source: 'Template' }));
        }
        return (getGenericQuestions(language)).map(q => ({ text: q, source: 'Generic Fallback' }));
    }

    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
    const targetLang = { 'en': 'English', 'hi': 'Hindi', 'bn': 'Bengali' }[language] || 'English';

    const templateContext = templateQuestions.length > 0 
        ? `\nCLINICAL CONTEXT (INCLUDE THESE QUESTIONS): \n${templateQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}` 
        : '';

    const systemPrompt = `You are a Clinical Intake Assistant. Help a physician collect a focused medical history.
Patient Complaint: ${complaint}
${templateContext}

STRICT GUIDELINES:
1. Generate a total of 5-8 professional, medically-relevant follow-up questions.
2. If CLINICAL CONTEXT questions are provided above, INCLUDE THEM and add more to reach the 5-8 count.
3. Respond ONLY in ${targetLang} (${language}) native script.
4. Use clinical frameworks like SOCRATES/OPQRST (Site, Onset, Character, Radiation, Associations, Time, Exacerbating/Relieving factors, Severity).
5. Ensure questions are high-yield and logically ordered.
6. No diagnosis. Be empathetic and professional.
7. Return ONLY a JSON array of strings. No markdown. No jokes.`;

    try {
        console.log(`--- Gemini AI Question Generation Started for: ${complaint} (Source: ${templateQuestions.length > 0 ? 'Enriched Template' : 'Full AI'}) ---`);
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        let text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        
        const questions = JSON.parse(text);
        const finalQuestions = Array.isArray(questions) ? questions.map(q => ({ text: q, source: 'AI' })) : [];
        console.log(`[Gemini] Generated ${finalQuestions.length} questions.`);
        return finalQuestions;
    } catch (e) {
        console.error("[Gemini] API call or parsing failed:", e.message);
        const fallbacks = (getGenericQuestions(language)).map(q => ({ text: q, source: 'Generic Fallback' }));
        console.log(`[Gemini] Returning ${fallbacks.length} generic fallback questions.`);
        return fallbacks;
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
    const targetLang = { 'en': 'English', 'hi': 'Hindi', 'bn': 'Bengali' }[language] || 'English';

    const qaPairsText = qaPairs.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n');
    const docsText = documents.map(d => `- [${d.filename}]: ${d.coordinator_note}`).join('\n');

    const systemPrompt = `You are a clinical documentation assistant. write a structured consultation summary.
Patient: ${patient.name}, ${patient.age}y, ${patient.gender}.
Chief Complaint: ${complaint}
Follow-up Q&A: \n${qaPairsText}\n
Docs: \n${docsText || 'None'}\n

Format response as JSON with:
- chief_complaint
- history_of_presenting_illness (narrative)
- key_findings (array of strings)
- clinical_flags (array of strings)
- assessment_notes
- suggested_medications
- suggested_tests

SUMMARY CONTENT MUST BE IN ENGLISH for medical records. Use high-level clinical vocabulary. Output ONLY raw JSON.`;

    try {
        console.log(`--- Gemini AI Summary Generation Started for Session via ${targetLang} ---`);
        const model = ai.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });
        
        const result = await model.generateContent(systemPrompt);
        const text = response.text().trim();
        const summary = JSON.parse(text);
        
        // Ensure non-blank fields using local data as fallback
        if (!summary.chief_complaint) summary.chief_complaint = complaint;
        if (!summary.history_of_presenting_illness) {
            summary.history_of_presenting_illness = `Patient presents with ${complaint}. ${qaPairs.length > 0 ? "Follow-up notes: " + qaPairs.map(qa => `${qa.question}: ${qa.answer}`).join('; ') : ""}`;
        }
        if (!summary.key_findings || summary.key_findings.length === 0) {
            summary.key_findings = documents.length > 0 ? documents.map(d => d.coordinator_note) : ["Routine consult"];
        }

        console.log("Successfully generated AI summary.");
        return summary;
    } catch (e) {
        console.error("Gemini summary generation failed:", e.message);
        return {
            chief_complaint: complaint,
            history_of_presenting_illness: `[Clinical Intake Fallback] Patient ${patient.name} (${patient.age}y ${patient.gender}) presents with: ${complaint}.\n\nFollow-up Details:\n${qaPairs.map(qa => `- ${qa.question}: ${qa.answer}`).join('\n')}`,
            key_findings: documents.map(d => `${d.filename}: ${d.coordinator_note}`),
            clinical_flags: ["Standard Intake Summary (AI Fallback)"],
            assessment_notes: "This summary was generated via clinical fallback logic due to an AI timeout.",
            suggested_medications: "N/A - Review required",
            suggested_tests: "N/A - Review required"
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
         const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
         const result = await model.generateContent(systemPrompt);
         const response = await result.response;
         const note = response.text().trim();
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
