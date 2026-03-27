const db = require('./database');

const migrateTemplates = () => {
    console.log("Starting template migration...");
    
    const templates = [
        // --- HINDI TEMPLATES ---
        { 
            name: 'Fever (HI)', 
            keywords: 'fever, bukhar, tap, hot, garam, thand, chills', 
            questions: JSON.stringify([
                "यह बुखार पहली बार कब शुरू हुआ?",
                "क्या आपको कंपकंपी या रात को पसीना आता है?",
                "क्या आपको सिरदर्द, गले में खराश या खांसी जैसे कोई अन्य लक्षण हैं?",
                "क्या आपने बुखार के लिए कोई दवा ली है, और क्या उससे मदद मिली?",
                "क्या आपने हाल ही में यात्रा की है या किसी बीमार व्यक्ति के आसपास रहे हैं?"
            ]) 
        },
        { 
            name: 'Cough (HI)', 
            keywords: 'cough, khansi, balgam, phlegm, sputum', 
            questions: JSON.stringify([
                "आपको यह खांसी कितने समय से है?",
                "क्या यह सूखी खांसी है, या आपको बलगम आ रहा है?",
                "यदि बलगम है, तो उसका रंग क्या है?",
                "क्या आपको बुखार, ठंड लगना या वजन कम होना महसूस हो रहा है?",
                "क्या खांसी रात में या ठंडी हवा में ज्यादा खराब हो जाती है?"
            ]) 
        },
        { 
            name: 'Chest Pain (HI)', 
            keywords: 'chest pain, seene mein dard, dil ka dard, pressure, heaviness, bhari pan', 
            questions: JSON.stringify([
                "सीने में दर्द कब शुरू हुआ?",
                "आप दर्द का वर्णन कैसे करेंगे (जैसे कि तेज, हल्का, भारी, जकड़न)?",
                "क्या दर्द कहीं और फैलता है, जैसे आपके हाथ, गर्दन या जबड़े में?",
                "किस चीज़ से दर्द ज्यादा या कम होता है?",
                "क्या आपको सांस की तकलीफ या पसीना आ रहा है?"
            ]) 
        },

        // --- BENGALI TEMPLATES ---
        { 
            name: 'Fever (BN)', 
            keywords: 'fever, jor, tap, gorom, thanda, chills', 
            questions: JSON.stringify([
                "এই জ্বর প্রথম কবে শুরু হয়েছিল?",
                "আপনার কি কাঁপুনি বা রাতে ঘাম হচ্ছে?",
                "মাথাব্যথা, গলা ব্যথা বা কাশির মতো অন্য কোনো উপসর্গ আছে কি?",
                "আপনি কি জ্বরের জন্য কোনো ওষুধ খেয়েছেন, এবং তাতে কি কোনো কাজ হয়েছে?",
                "আপনি কি সম্প্রতি কোথাও ভ্রমণ করেছেন বা কোনো অসুস্থ ব্যক্তির সংস্পর্শে এসেছেন?"
            ]) 
        },
        { 
            name: 'Cough (BN)', 
            keywords: 'cough, kashi, kof, phlegm, sputum', 
            questions: JSON.stringify([
                "আপনার এই কাশি কতদিন ধরে হচ্ছে?",
                "এটি কি শুকনো কাশি, নাকি আপনার কফ/শ্লেষ্মা উঠছে?",
                "যদি কফ থাকে তবে তার রঙ কী?",
                "আপনার কি জ্বর, কাঁপুনি বা ওজন কমার মতো কোনো সমস্যা আছে?",
                "কাশি কি রাতে বা ঠান্ডা বাতাসে আরও বেড়ে যায়?"
            ]) 
        },
        { 
            name: 'Chest Pain (BN)', 
            keywords: 'chest pain, buke batha, pressure, bhari bhab, heaviness', 
            questions: JSON.stringify([
                "বুকে ব্যথা কবে শুরু হয়েছিল?",
                "ব্যথাটি কেমন (যেমন- তীব্র, হালকা, ভারী, নাকি চাপ ধরা)?",
                "ব্যথা কি অন্য কোথাও ছড়িয়ে পড়ে, যেমন- আপনার হাত, ঘাড় বা চোয়ালে?",
                "কী করলে ব্যথা বেশি বা কম হয়?",
                "আপনার কি শ্বাসকষ্ট বা ঘাম হচ্ছে?"
            ]) 
        }
    ];

    db.serialize(() => {
        const stmt = db.prepare('INSERT INTO templates (name, trigger_keywords, questions) VALUES (?, ?, ?)');
        
        templates.forEach(t => {
            stmt.run([t.name, t.keywords, t.questions], (err) => {
                if (err) console.error(`Failed to insert ${t.name}:`, err.message);
                else console.log(`Inserted template: ${t.name}`);
            });
        });
        
        stmt.finalize(() => {
            console.log("Template migration completed.");
            process.exit(0);
        });
    });
};

migrateTemplates();
