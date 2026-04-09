const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const missingTemplates = [
    // --- ABDOMINAL PAIN ---
    {
        name: 'Abdominal Pain (HI)',
        keywords: 'pet dard, abdominal pain, stomach ache, dast, vomiting, nausea',
        questions: [
            "पेट में दर्द कब शुरू हुआ?",
            "दर्द पेट के किस हिस्से में है (ऊपर, नीचे, दाएँ या बाईं ओर)?",
            "दर्द कैसा महसूस होता है (तेज़, मरोड़ वाला, या लगातार रहने वाला)?",
            "क्या आपको मतली, उल्टी या दस्त की शिकायत है?",
            "क्या दर्द खाने के बाद बढ़ जाता है या कुछ खास खाने से संबंधित है?"
        ]
    },
    {
        name: 'Abdominal Pain (BN)',
        keywords: 'pete betha, abdominal pain, stomach ache, bomy, baddi',
        questions: [
            "পেটে ব্যথা কখন শুরু হয়েছিল?",
            "ব্যথা পেটের কোন অংশে হচ্ছে (ওপরে, নিচে, ডানদিকে না বামদিকে)?",
            "ব্যথাটি কেমন (তীব্র, মোচড়ানো নাকি একটানা)?",
            "আপনার কি বমি বমি ভাব, বমি বা ডায়রিয়া হচ্ছে?",
            "খাবার খাওয়ার পর কি ব্যথা বেড়ে যায়?"
        ]
    },
    // --- HEADACHE ---
    {
        name: 'Headache (HI)',
        keywords: 'sar dard, headache, matha dard, migraine, chakkar',
        questions: [
            "सिरदर्द कब शुरू हुआ और यह कितनी बार होता है?",
            "सिर के किस हिस्से में दर्द है (सामने, पीछे, या एक तरफ)?",
            "क्या आपको रोशनी या तेज़ आवाज़ से परेशानी होती है?",
            "क्या आपको चक्कर आना या धुंधला दिखाई देने जैसे लक्षण हैं?",
            "क्या आपने इसके लिए कोई दवा ली है?"
        ]
    },
    {
        name: 'Headache (BN)',
        keywords: 'matha betha, headache, migraine, matha ghora',
        questions: [
            "মাথাব্যথা কখন শুরু হয়েছিল এবং এটি কত ঘন ঘন হয়?",
            "মাথার কোন অংশে ব্যথা হচ্ছে (সামনে, পেছনে, নাকি একপাশে)?",
            "আপনার কি আলো বা প্রচণ্ড শব্দে অসুবিধা হয়?",
            "মাথা ঘোরা বা ঝাপসা দেখার মতো কোনো সমস্যা আছে কি?",
            "এর জন্য কি কোনো ওষুধ খেয়েছেন?"
        ]
    },
    // --- BREATHLESSNESS (Baseline) ---
    {
        name: 'Breathlessness (HI)',
        keywords: 'saans phoolna, dam phoolna, saans ki takleef, breathless',
        questions: [
            "आपको कब से सांस फूलने की शिकायत महसूस हो रही है?",
            "क्या यह चलते समय या आराम करते समय भी होता है?",
            "क्या आपको सीने में जकड़न या घरघराहट महसूस होती है?",
            "क्या रात में सोते समय सांस लेने में ज़्यादा दिक्कत होती है?",
            "क्या आप इसके लिए किसी इनहेलर का उपयोग करते हैं?"
        ]
    },
    {
        name: 'Breathlessness (BN)',
        keywords: 'shashkoshto, hapaia jaoa, dam phatie jaoa, breathless',
        questions: [
            "কতদিন ধরে আপনি শ্বাসকষ্ট অনুভব করছেন?",
            "এটি কি হাঁটাচলার সময় হয় নাকি বিশ্রামের সময়ও হচ্ছে?",
            "আপনার কি বুকে জাঁকিয়ে ধরা বা সাঁই সাঁই শব্দ হওয়ার মতো সমস্যা আছে?",
            "রাতে ঘুমানোর সময় কি শ্বাসকষ্ট আরও বেড়ে যায়?",
            "আপনি কি ইনহেলার ব্যবহার করেন?"
        ]
    }
];

async function restore() {
    const tenantIds = ['default-clinic-id', 'demo-tenant-id'];
    console.log('Restoring missing baseline translations...');
    
    try {
        for (const tenantId of tenantIds) {
            for (const t of missingTemplates) {
                await pool.query(
                    'INSERT INTO templates (name, trigger_keywords, questions, tenant_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
                    [t.name, t.keywords, JSON.stringify(t.questions), tenantId]
                );
            }
        }
        console.log('✓ Successfully restored missing Hindi and Bengali core templates.');
    } catch (err) {
        console.error('Failed to restore templates:', err.message);
    } finally {
        await pool.end();
    }
}

restore();
