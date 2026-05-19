const db = require('./database');

const templates = [
    // --- COUGH ---
    {
        name: 'Cough',
        keywords: 'cough, phlegm, sputum, congestion',
        questions: [
            "How many days/weeks/months have you had this cough? Did it start suddenly or gradually?",
            "Is it a dry cough, or are you bringing up phlegm/sputum?",
            "If productive: What is the color of the phlegm (clear, yellow, green, rust-colored)?",
            "Is the cough worse at a specific time of day, such as late at night or early in the morning?",
            "Does anything specifically trigger the cough, like cold air, dust, or talking?",
            "Does anything make it better, like sitting up or drinking warm fluids?"
        ]
    },
    {
        name: 'Cough (HI)',
        keywords: 'khansi, balgam, cough',
        questions: [
            "आपको यह खांसी कितने दिनों/हफ्तों/महीनों से है? क्या यह अचानक शुरू हुई या धीरे-धीरे?",
            "क्या यह सूखी खांसी है, या बलगम आ रहा है?",
            "बलगम का रंग क्या है (साफ, पीला, हरा, जंग जैसा भूरा)?",
            "क्या खांसी रात में या सुबह जल्दी ज़्यादा खराब होती है?",
            "क्या कोई विशेष चीज़ खांसी को बढ़ाती है, जैसे ठंडी हवा या धूल?",
            "क्या किसी चीज़ से आराम मिलता है, जैसे गर्म तरल पदार्थ पीना?"
        ]
    },
    {
        name: 'Cough (BN)',
        keywords: 'kashi, kof, cough',
        questions: [
            "আপনার এই কাশি কত দিন/সপ্তাহ/মাস ধরে হচ্ছে? এটি কি হঠাৎ শুরু হয়েছে নাকি ধীরে ধীরে?",
            "এটি কি শুকনো কাশি, নাকি আপনার কফ/শ্লেষ্মা উঠছে?",
            "কফের রঙ কী (স্বচ্ছ, হলুদ, সবুজ, লালচে)?",
            "কাশি কি রাতে বা ভোরের দিকে আরও বেড়ে যায়?",
            "কোন নির্দিষ্ট কারণে কি কাশি বেড়ে যায়, যেমন ঠান্ডা হাওয়া বা ধুলোবালি?",
            "কি করলে কাশি কমে যায়, যেমন গরম পানীয় পান করলে?"
        ]
    },

    // --- BREATHLESSNESS ---
    {
        name: 'Breathlessness (Dyspnea)',
        keywords: 'breathlessness, shortness of breath, breathless, panting, struggling to breathe',
        questions: [
            "How long have you felt breathless, and has it been getting worse over time?",
            "How much activity makes you breathless? (e.g., walking on level ground, or even just dressing?)",
            "Do you wake up at night short of breath? Do you need multiple pillows to sleep?",
            "Are there days when your breathing is completely fine, or is it a constant struggle?",
            "Is the breathlessness accompanied by any wheezing or whistling sound from the chest?"
        ]
    },
    {
        name: 'Breathlessness (HI)',
        keywords: 'saans phoolna, dam phoolna, saans ki takleef, breathless',
        questions: [
            "आपको कब से सांस फूलने की शिकायत महसूस हो रही है, और क्या यह समय के साथ खराब होती जा रही है?",
            "कितनी गतिविधि आपको सांस लेने में तकलीफ देती है? (जैसे समतल ज़मीन पर चलना, या सिर्फ कपड़े पहनना?)",
            "क्या आप रात के बीच में सांस की कमी महसूस करके जाग जाते हैं? क्या आपको सोने के लिए कई तकियों की ज़रूरत पड़ती है?",
            "क्या ऐसे दिन भी होते हैं जब आपकी सांस बिल्कुल ठीक रहती है, या यह रोज़ाना का संघर्ष है?",
            "क्या सांस फूलने के साथ छाती से घरघराहट या सीटी जैसी आवाज़ आती है?"
        ]
    },
    {
        name: 'Breathlessness (BN)',
        keywords: 'shashkoshto, hapaia jaoa, dam phatie jaoa, breathless',
        questions: [
            "কতদিন ধরে আপনি শ্বাসকষ্ট অনুভব করছেন এবং এটি কি সময়ের সাথে বাড়ছে?",
            "কতটা পরিশ্রম করলে আপনার শ্বাসকষ্ট হয়? (যেমন সাধারণ সমতল জায়গায় হাঁটলে, নাকি পোশাক পরার মতো সামান্য কাজেও?)",
            "আপনি কি মাঝরাতে শ্বাসকষ্টের কারণে জেগে ওঠেন? ঘুমানোর সময় কি আপনাকে একাধিক বালিশ ব্যবহার করতে হয়?",
            "এমন কোনো দিন আছে যখন আপনার শ্বাসকষ্ট একদমই থাকে না, নাকি এটি নিয়মিত সমস্যা?",
            "শ্বাসকষ্টের সাথে কি বুকে কোনো সাইঁ সাইঁ বা বাঁশির মতো শব্দ হয়?"
        ]
    },

    // --- CHEST PAIN ---
    {
        name: 'Chest Pain',
        keywords: 'chest pain, angina, heart pain, pressure in chest',
        questions: [
            "Exactly where in your chest is the pain? Does it travel to your back, neck, jaw, or arms?",
            "How does the pain feel? Is it a sharp pain, a heavy pressure, or a burning sensation?",
            "Does the pain get sharper or worse when you take a deep breath or cough?",
            "When you have this pain, do you also feel sweaty, dizzy, or nauseous?",
            "Is the pain brought on by physical exertion and relieved by rest?"
        ]
    },
    {
        name: 'Chest Pain (HI)',
        keywords: 'seene mein dard, chhati dard, dil ka dard, chest pain',
        questions: [
            "ठीक किस जगह आपके सीने में दर्द है? क्या यह आपकी पीठ, गर्दन, जबड़े या बाहों तक जाता है?",
            "दर्द कैसा महसूस होता है? क्या यह तेज़ चुभने वाला दर्द है या भारी दबाव है?",
            "जब आप गहरी सांस लेते हैं या खांसते हैं, तो क्या दर्द तेज़ हो जाता है?",
            "जब आपको यह दर्द होता है, तो क्या आप पसीना, चक्कर आना या जी मिचलाना महसूस करते हैं?",
            "क्या यह दर्द शारीरिक परिश्रम से शुरू होता है और आराम करने पर ठीक हो जाता है?"
        ]
    },
    {
        name: 'Chest Pain (BN)',
        keywords: 'buke batha, buker dard, chest pain',
        questions: [
            "ঠিক আপনার বুকের কোথায় ব্যথা অনুভব করছেন? এটি কি আপনার পিঠ, ঘাড়, চোয়াল বা হাতে ছড়িয়ে পড়ে?",
            "ব্যথাটি কেমন লাগে? এটি কি তীক্ষ্ণ ব্যথা, নাকি কোনও ভারী চাপ অনুভব করছেন?",
            "গভীর শ্বাস নিলে বা কাশলে কি ব্যথাটি আরও তীব্র হয়?",
            "যখন ব্যথা হয়, তখন কি আপনি ঘামছেন, মাথা ঘুরছে বা বমি বমি ভাব অনুভব করছেন?",
            "শারীরিক পরিশ্রম করলে কি এই ব্যথা শুরু হয় এবং বিশ্রাম নিলে কি কমে যায়?"
        ]
    },

    // --- FEVER ---
    {
        name: 'Fever',
        keywords: 'fever, temperature, hot, chills',
        questions: [
            "Do you get the fever every day? Is it higher in the evenings or nights?",
            "Do you experience severe shivering (chills) or sweats when the fever breaks?",
            "How many days have you had the fever, and have you checked the temperature?",
            "Have you taken any medicines and did the temperature come down?",
            "Are there any associated symptoms like a skin rash, joint pain, or headache?"
        ]
    },
    {
        name: 'Fever (HI)',
        keywords: 'bukhar, tap, thand, fever',
        questions: [
            "क्या आपको रोज़ाना बुखार आता है? क्या यह शाम या रात के समय ज़्यादा होता है?",
            "क्या आपको बुखार उतरते समय तेज़ कंपकंपी या पसीने का अहसास होता है?",
            "कितने दिनों से बुखार है, और क्या आपने थर्मामीटर पर तापमान चेक किया है?",
            "क्या आपने कोई दवा ली है और क्या उससे तापमान कम हुआ?",
            "क्या बुखार के साथ शरीर पर दाने, जोड़ों में दर्द या सिरदर्द है?"
        ]
    },
    {
        name: 'Fever (BN)',
        keywords: 'jwor, tap, thanda, fever',
        questions: [
            "জ্বর কি প্রতিদিন আসছে? বিকেল বা রাতে কি এটি বেশী থাকে?",
            "জ্বর ছাড়ার সময় আপনার কি খুব কাঁপুনি হয় অথবা ঘাম হয়?",
            "কত দিন ধরে আপনার জ্বর হয়েছে এবং আপনি কি তাপমাত্রা পরীক্ষা করেছেন?",
            "আপনি কি কোনো ওষুধ খেয়েছেন এবং তাতে কি জ্বর কমেছে?",
            "জ্বরের সঙ্গে গায়ে কোনো ফুসকুড়ি, জয়েন্টে ব্যথা বা মাথাব্যথা আছে কি?"
        ]
    }
];

async function seed() {
    console.log("[Consolidate] Seeding consolidated detailed templates...");
    const tenantIds = ['default-clinic-id', 'demo-tenant-id']; 

    try {
        for (const tenantId of tenantIds) {
            for (const t of templates) {
                const questionsJson = JSON.stringify(t.questions);
                const keywords = t.keywords;

                await db.run("INSERT INTO templates (name, questions, trigger_keywords, tenant_id) VALUES (?, ?, ?, ?)", 
                    [t.name, questionsJson, keywords, tenantId]);
            }
        }
        console.log("[Consolidate] Consolidation finished.");
    } catch (err) {
        console.error("[Consolidate] Seeding failed:", err.message);
    }
}

if (require.main === module) {
    seed();
}

module.exports = seed;
