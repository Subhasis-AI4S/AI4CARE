const db = require('./database');

const migrateTemplates = async () => {
    console.log("Starting basic templates migration...");
    const defaultTenantIds = ['default-clinic-id', 'demo-tenant-id'];
    
    const templates = [
        // --- ENGLISH TEMPLATES (BASE) ---
        { 
            name: 'Fever', 
            keywords: 'fever, hot, chills, temperature', 
            questions: [
                "When did this fever first start?",
                "Do you have chills or night sweats?",
                "Do you have any other symptoms like headache, sore throat, or cough?",
                "Have you taken any medication for the fever, and did it help?",
                "Have you travelled recently or been around anyone who is sick?"
            ] 
        },
        { 
            name: 'Cough', 
            keywords: 'cough, phlegm, sputum', 
            questions: [
                "How long have you had this cough?",
                "Is it a dry cough, or are you bringing up phlegm/sputum?",
                "If there is phlegm, what color is it?",
                "Are you experiencing fever, chills, or weight loss?",
                "Does the cough get worse at night or in cold air?"
            ] 
        },
        { 
            name: 'Cold', 
            keywords: 'cold, flu, runny nose, sneezing, congestion', 
            questions: [
                "When did your cold symptoms start?",
                "Do you have a runny or stuffy nose?",
                "Are you experiencing any sneezing or sore throat?",
                "Do you have a cough or fever alongside the cold?",
                "Is there any facial pain or pressure?"
            ] 
        },
        { 
            name: 'Chest Pain', 
            keywords: 'chest pain, pressure, heaviness', 
            questions: [
                "When did the chest pain start?",
                "How would you describe the pain (e.g., sharp, dull, heavy, pressure)?",
                "Does the pain spread anywhere else, like your arm, neck, or jaw?",
                "What makes the pain better or worse?",
                "Are you experiencing any shortness of breath or sweating?"
            ] 
        },

        // --- HINDI TEMPLATES ---
        { 
            name: 'Fever (HI)', 
            keywords: 'fever, bukhar, tap, hot, garam, thand, chills', 
            questions: [
                "यह बुखार पहली बार कब शुरू हुआ?",
                "क्या आपको कंपकंपी या रात को पसीना आता है?",
                "क्या आपको सिरदर्द, गले में खराश या खांसी जैसे कोई अन्य लक्षण हैं?",
                "क्या आपने बुखार के लिए कोई दवा ली है, और क्या उससे मदद मिली?",
                "क्या आपने हाल ही में यात्रा की है या किसी बीमार व्यक्ति के आसपास रहे हैं?"
            ] 
        },
        { 
            name: 'Cough (HI)', 
            keywords: 'cough, khansi, balgam, phlegm, sputum', 
            questions: [
                "आपको यह खांसी कितने समय से है?",
                "क्या यह सूखी खांसी है, या आपको बलगम आ रहा है?",
                "यदि बलगम है, तो उसका रंग क्या है?",
                "क्या आपको बुखार, ठंड लगना या वजन कम होना महसूस हो रहा है?",
                "क्या खांसी रात में या ठंडी हवा में ज्यादा खराब हो जाती है?"
            ] 
        },
        { 
            name: 'Chest Pain (HI)', 
            keywords: 'chest pain, seene mein dard, dil ka dard, pressure, heaviness, bhari pan', 
            questions: [
                "सीने में दर्द कब शुरू हुआ?",
                "आप दर्द का वर्णन कैसे करेंगे (जैसे कि तेज, हल्का, भारी, जकड़न)?",
                "क्या दर्द कहीं और फैलता है, जैसे आपके हाथ, गर्दन या जबड़े में?",
                "किस चीज़ से दर्द ज्यादा या कम होता है?",
                "क्या आपको सांस की तकलीफ या पसीना आ रहा है?"
            ] 
        },

        // --- BENGALI TEMPLATES ---
        { 
            name: 'Fever (BN)', 
            keywords: 'fever, jor, tap, gorom, thanda, chills', 
            questions: [
                "এই জ্বর প্রথম কবে শুরু হয়েছিল?",
                "আপনার কি কাঁপুনি বা রাতে ঘাম হচ্ছে?",
                "মাথাব্যথা, গলা ব্যথা বা কাশির মতো অন্য কোনো উপসর্গ আছে কি?",
                "আপনি কি জ্বরের জন্য কোনো ওষুধ খেয়েছেন, এবং তাতে কি কোনো কাজ হয়েছে?",
                "আপনি কি সম্প্রতি কোথাও ভ্রমণ করেছেন বা কোনো অসুস্থ ব্যক্তির সংস্পর্শে এসেছেন?"
            ] 
        },
        { 
            name: 'Cough (BN)', 
            keywords: 'cough, kashi, kof, phlegm, sputum', 
            questions: [
                "আপনার এই কাশি কতদিন ধরে হচ্ছে?",
                "এটি কি শুকনো কাশি, নাকি আপনার কফ/শ্লেষ্মা উঠছে?",
                "যদি কফ থাকে তবে তার রঙ কী?",
                "আপনার কি জ্বর, কাঁপুনি বা ওজন কমার মতো কোনো সমস্যা আছে?",
                "কাশি কি রাতে বা ঠান্ডা বাতাসে আরও বেড়ে যায়?"
            ] 
        },
        { 
            name: 'Chest Pain (BN)', 
            keywords: 'chest pain, buke batha, pressure, bhari bhab, heaviness', 
            questions: [
                "বুকে ব্যথা কবে শুরু হয়েছিল?",
                "ব্যথাটি কেমন (যেমন- তীব্র, হালকা, ভারী, নাকি চাপ ধরা)?",
                "ব্যথা কি অন্য কোথাও ছড়িয়ে পড়ে, যেমন- আপনার হাত, ঘাড় বা চোয়ালে?",
                "কী করলে ব্যথা বেশি বা কম হয়?",
                "আপনার কি শ্বাসকষ্ট বা ঘাম হচ্ছে?"
            ] 
        }
    ];

    try {
        for (const tenantId of defaultTenantIds) {
            for (const t of templates) {
                const existing = await db.get('SELECT id FROM templates WHERE name = ? AND tenant_id = ?', [t.name, tenantId]);
                
                if (existing) {
                    await db.run('UPDATE templates SET trigger_keywords = ?, questions = ? WHERE id = ?', 
                        [t.keywords, JSON.stringify(t.questions), existing.id]);
                } else {
                    if (db.isPg) {
                        try {
                            await db.run('INSERT INTO templates (name, trigger_keywords, questions, tenant_id) VALUES (?, ?, ?, ?)', 
                                [t.name, t.keywords, JSON.stringify(t.questions), tenantId]);
                        } catch (e) {
                            if (!e.message.includes('duplicate key value')) throw e;
                        }
                    } else {
                        await db.run('INSERT OR IGNORE INTO templates (name, trigger_keywords, questions, tenant_id) VALUES (?, ?, ?, ?)', 
                            [t.name, t.keywords, JSON.stringify(t.questions), tenantId]);
                    }
                }
            }
        }
        console.log("Basic Template migration completed.");
    } catch (err) {
        console.error("Basic Template migration failed:", err.message);
    }
};

module.exports = migrateTemplates;
