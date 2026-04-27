const { GoogleGenAI } = require('@google/genai');
const db = require('./db/database');

const getApiKey = async (tenantId) => {
    try {
        console.log(`[Gemini] Fetching API key for tenant: ${tenantId}`);
        // Ensure ALL tenant_id comparisons use ::text in PostgreSQL to avoid UUID/String mismatch
        const query = db.isPg 
            ? "SELECT value FROM settings WHERE key = 'gemini_api_key' AND (tenant_id::text = ? OR tenant_id::text = 'default-clinic-id') ORDER BY CASE WHEN tenant_id::text = ? THEN 1 ELSE 2 END ASC LIMIT 1"
            : "SELECT value FROM settings WHERE key = 'gemini_api_key' AND (tenant_id = ? OR tenant_id = 'default-clinic-id') ORDER BY tenant_id DESC LIMIT 1";
        
        const params = db.isPg ? [tenantId, tenantId] : [tenantId];
        const row = await db.get(query, params);
        
        if (row && row.value) {
            console.log(`[Gemini] API Key found (ends with: ...${row.value.slice(-4)})`);
            return row.value;
        }
        console.warn(`[Gemini] No API Key found for tenant id: ${tenantId}.`);
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
        const query = db.isPg 
            ? "SELECT * FROM templates WHERE tenant_id::text = ? OR tenant_id::text = 'default-clinic-id'"
            : "SELECT * FROM templates WHERE tenant_id = ? OR tenant_id = 'default-clinic-id'";
        const templates = await db.all(query, [tenantId]);
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
    const query = db.isPg 
        ? "SELECT * FROM templates WHERE tenant_id::text = ? OR tenant_id::text = 'default-clinic-id'"
        : "SELECT * FROM templates WHERE tenant_id = ? OR tenant_id = 'default-clinic-id'";
    const templates = await db.all(query, [tenantId]);
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

    // Match Templates with Fuzzy Support for missing spaces
    let matchedTemplates = templates.filter(t => {
        const nameUpper = (t.name || '').toUpperCase();
        if (otherLangTags.some(tag => nameUpper.includes(tag))) return false;
        
        const keywords = (t.trigger_keywords || '').split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
        
        return keywords.some(k => {
            // Use regex for whole-word matching to avoid partial overlaps like 'ache' in 'headache'
            // but still allow phrases like 'abdominal pain' to match 'I have abdominal pain'
            const escapedK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special chars
            const regex = new RegExp(`(^|\\P{L})${escapedK}(\\P{L}|$)`, 'iu');
            return regex.test(lowerComplaint);
        });
    });

    // Prioritization: Sort matches (longer keyword match first or exact name match)
    matchedTemplates.sort((a, b) => {
        const aExact = a.name.toLowerCase() === lowerComplaint ? 1 : 0;
        const bExact = b.name.toLowerCase() === lowerComplaint ? 1 : 0;
        return bExact - aExact;
    });

    console.log(`[Gemini] Matched ${matchedTemplates.length} templates: ${matchedTemplates.map(t => t.name).join(', ')}`);

    // COLLECT ALL questions from ALL matched templates (Combine them for more variety)
    const allQuestions = [];
    const seenQs = new Set();

    for (const t of matchedTemplates) {
        try {
            let rawQs = t.questions || '[]';
            let parsedQs = [];
            if (typeof rawQs !== 'string') parsedQs = Array.isArray(rawQs) ? rawQs : [rawQs];
            else if (rawQs.trim().startsWith('[') || rawQs.trim().startsWith('{')) parsedQs = JSON.parse(rawQs);
            else parsedQs = rawQs.split('\n').filter(q => q.trim().length > 0);
            
            const localizedQs = (Array.isArray(parsedQs) ? parsedQs : [parsedQs]).map(q => 
                typeof q === 'string' ? q : (q[language] || q.en || q.hi || q.bn || '')
            ).filter(q => q.trim().length > 0);

            for (const q of localizedQs) {
                if (!seenQs.has(q.toLowerCase())) {
                    allQuestions.push(q);
                    seenQs.add(q.toLowerCase());
                }
            }
        } catch (e) {
            console.error(`[Templates] Failure parsing questions for ${t.name}:`, e);
        }
    }
    const templateQuestions = allQuestions;

    // 2. Fall back to Gemini for enrichment or full generation
    const apiKey = await getApiKey(tenantId);
    if (!apiKey) {
        let finalQs = templateQuestions;
        // Floor of 6: If templates don't provide enough questions, fill with generic ones
        if (finalQs.length < 5) {
            const extra = getGenericQuestions(language);
            const existingTexts = new Set(finalQs.map(f => f.toLowerCase()));
            for (const ex of extra) {
                if (!existingTexts.has(ex.toLowerCase()) && finalQs.length < 6) {
                    finalQs.push(ex);
                }
            }
        }
        console.log(`[Gemini] No API Key. Returning ${finalQs.length} questions (Templates matched: ${templateQuestions.length}).`);
        return finalQs;
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
4. Use clinical frameworks like SOCRATES/OPQRST.
5. Return ONLY a JSON array of strings.`;

    let rawText = '';
    try {
        console.log(`--- Gemini AI Question Generation: ${complaint} ---`);
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: systemPrompt
        });
        rawText = response.text || '';
        
        let jsonText = rawText.includes('[') ? rawText.substring(rawText.indexOf('['), rawText.lastIndexOf(']') + 1) : rawText;
        const questions = JSON.parse(jsonText);
        const finalQuestions = Array.isArray(questions) ? questions.map(q => typeof q === 'string' ? q : q.text || JSON.stringify(q)) : [];
        console.log(`[Gemini] Generated ${finalQuestions.length} questions successfully.`);
        return finalQuestions;
    } catch (e) {
        console.error("[Gemini] API error during prompt:", e.message);
        
        // --- THE FIX: Maintain Template Questions on API failure ---
        if (templateQuestions && templateQuestions.length > 0) {
            console.log(`[Gemini] API failed. Falling back to ${templateQuestions.length} matched templates.`);
            return templateQuestions;
        }

        console.warn("[Gemini] API failed and no templates matched. Returning generic questions.");
        return getGenericQuestions(language);
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
        return {
            chief_complaint: complaint,
            history_of_presenting_illness: `Patient ${patient.name} presents with ${complaint}. Q&A: ${qaPairs.map(qa => `${qa.question}: ${qa.answer}`).join('; ')}`,
            key_findings: documents.map(d => d.coordinator_note),
            clinical_flags: ["Manual Assessment Recommended"],
            assessment_notes: "Auto-summary fallback.",
            suggested_medications: "Review required",
            suggested_tests: "Review required"
        };
    }

    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
    const qaText = qaPairs.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n');
    const prompt = `Write a structured English clinical summary for: ${patient.name}, ${patient.age}y. Complaint: ${complaint}. Q&A: \n${qaText}.\nFormat as JSON with: chief_complaint, history_of_presenting_illness, key_findings (array), clinical_flags (array), assessment_notes, suggested_medications, suggested_tests.`;

    let rawText = '';
    try {
        console.log(`--- Gemini AI Summary: ${patient.name} ---`);
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash-latest',
            contents: prompt
        });
        rawText = response.text || '';
        
        // Robust JSON Extraction
        let jsonText = rawText.includes('{') ? rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1) : rawText;
        const summary = JSON.parse(jsonText);
        console.log("[Gemini] Generated summary successfully.");
        return summary;
    } catch (e) {
        const manualHpi = qaPairs.length > 0 
            ? qaPairs.map(qa => `• ${qa.question}: ${qa.answer}`).join('\n')
            : "No follow-up questions were answered.";
            
        return { 
            chief_complaint: complaint, 
            history_of_presenting_illness: manualHpi, 
            key_findings: documents.map(d => d.coordinator_note || d.filename).filter(n => n), 
            clinical_flags: ["Manual Assessment Recommended"], 
            assessment_notes: "Physician assessment and objective findings to be recorded below.", 
            suggested_medications: "Clinical correlation required for prescription.", 
            suggested_tests: "Routine investigations as per clinical judgment." 
        };
    }
};

const generateDocumentNote = async (filename, description, language = 'en', tenantId) => {
    const apiKey = await getApiKey(tenantId);
    if (!apiKey) return `Document: ${filename}. Context: ${description}`;

    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash-latest',
            contents: `Write a professional English clinical note for document "${filename}" with context: "${description}".`
        });
        return response.text || description;
    } catch (e) {
        return `Record: ${filename}. Note: ${description}`;
    }
};

module.exports = {
    generateQuestions,
    generateSummary,
    generateDocumentNote
};
