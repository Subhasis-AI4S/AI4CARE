const db = require('./database');

const templates = [
    // --- COUGH ---
    {
        name: 'Cough',
        keywords: 'cough, phlegm, sputum, khansi, balgam, kashi, kof',
        questions: [
            "How many days/weeks/months have you had this cough? Did it start suddenly or gradually?",
            "Is it a dry cough, or are you bringing up phlegm/sputum?",
            "If productive: What is the color of the phlegm (clear, yellow, green, rust-colored)? Roughly how much do you produce in a day?",
            "Is the cough worse at a specific time of day, such as late at night or early in the morning?",
            "Does anything specifically trigger the cough, like cold air, dust, strong smells, or talking?",
            "Does anything make it better, like sitting up, drinking warm fluids, or using an inhaler?"
        ]
    },
    {
        name: 'Cough (HI)',
        keywords: 'khansi, balgam, sukhi khansi, purani khansi, cough',
        questions: [
            "आपको यह खांसी कितने दिनों/हफ्तों/महीनों से है? क्या यह अचानक शुरू हुई या धीरे-धीरे?",
            "क्या यह सूखी खांसी है, या बलगम आ रहा है?",
            "बलगम का रंग क्या है (साफ, पीला, हरा, जंग जैसा भूरा)? आप दिन में लगभग कितना बलगम निकालते हैं?",
            "क्या खांसी दिन के किसी विशेष समय पर अधिक खराब होती है, जैसे देर रात या सुबह जल्दी?",
            "क्या कोई विशेष चीज़ खांसी को बढ़ाती है, जैसे ठंडी हवा, धूल, तेज़ गंध या बात करना?",
            "क्या किसी चीज़ से आराम मिलता है, जैसे उठकर बैठना, गर्म तरल पदार्थ पीना, या इनहेलर का उपयोग करना?"
        ]
    },
    {
        name: 'Cough (BN)',
        keywords: 'kashi, kof, shukhno kashi, purono kashi, cough',
        questions: [
            "আপনার এই কাশি কত দিন/সপ্তাহ/মাস ধরে হচ্ছে? এটি কি হঠাৎ শুরু হয়েছে নাকি ধীরে ধীরে?",
            "এটি কি শুকনো কাশি, নাকি আপনার কফ/শ্লেষ্মা উঠছে?",
            "কফের রঙ কী (স্বচ্ছ, হলুদ, সবুজ, লালচে)? আপনি দিনে মোটামুটি কতটা কফ তৈরি করেন?",
            "কাশি কি দিনের নির্দিষ্ট সময়ে আরও বেড়ে যায়, যেমন গভীর রাতে বা ভোরের দিকে?",
            "কোন নির্দিষ্ট কারণে কি কাশি বেড়ে যায়, যেমন ঠান্ডা হাওয়া, ধুলোবালি, কড়া গন্ধ বা কথা বলা?",
            "কি করলে কাশি কমে যায়, যেমন সোজা হয়ে বসলে, গরম পানীয় পান করলে, বা ইনহেলার ব্যবহার করলে?"
        ]
    },

    // --- BREATHLESSNESS ---
    {
        name: 'Breathlessness (Dyspnea)',
        keywords: 'breathlessness, shortness of breath, dampa, saans phoolna, shashkoshto',
        questions: [
            "How long have you felt breathless, and has it been getting worse over time?",
            "How much activity makes you breathless? (e.g., strenuous exercise, walking on level ground, or even just dressing?)",
            "Do you wake up at night short of breath (PND)? Do you need to prop yourself up with multiple pillows to sleep (Orthopnea)?",
            "Are there days when your breathing is completely fine, or is it a constant daily struggle?",
            "Is the breathlessness accompanied by any wheezing or whistling sound from the chest?"
        ]
    },
    {
        name: 'Breathlessness (HI)',
        keywords: 'saans phoolna, dam phoolna, saans ki takleef, breathless',
        questions: [
            "आपको कब से सांस फूलने की शिकायत महसूस हो रही है, और क्या यह समय के साथ खराब होती जा रही है?",
            "इनमें से कौन सा आपकी सांस लेने की स्थिति का सबसे अच्छा वर्णन करता है: क्या आपकी सांस केवल ज़ोरदार व्यायाम के दौरान फूलती है, समतल ज़मीन पर जल्दी चलने पर, सामान्य गति से चलने पर, या कपड़े पहनते/उतारते समय?",
            "क्या आप रात के बीच में सांस की कमी (PND) महसूस करके जाग जाते हैं? क्या आपको सोने के लिए कई तकियों का सहारा लेने की ज़रूरत पड़ती है (Orthopnea)?",
            "क्या ऐसे दिन भी होते हैं जब आपकी सांस बिल्कुल ठीक रहती है, या यह रोज़ाना का संघर्ष है?",
            "क्या सांस फूलने के साथ छाती से घरघराहट या सीटी जैसी आवाज़ आती है?"
        ]
    },
    {
        name: 'Breathlessness (BN)',
        keywords: 'shashkoshto, hapaia jaoa, dam phatie jaoa, breathless',
        questions: [
            "কতদিন ধরে আপনি শ্বাসকষ্ট অনুভব করছেন এবং এটি কি সময়ের সাথে বাড়ছে?",
            "কোনটি আপনার শ্বাসকষ্টের সেরা বর্ণনা দেয়: আপনি কি কেবল কঠোর পরিশ্রমের সময় হাঁপিয়ে যান, সমতল ভূমিতে দ্রুত হাঁটলে, সাধারণ গতিতে হাঁটলে, নাকি পোশাক পরা বা খোলার সময়ও হাঁপিয়ে যান?",
            "আপনি কি মাঝরাতে শ্বাসকষ্টের কারণে জেগে ওঠেন (PND)? ঘুমানোর সময় কি আপনাকে একাধিক বালিশ দিয়ে নিজেকে উঁচু করে রাখতে হয় (Orthopnea)?",
            "এমন কোনো দিন আছে যখন আপনার শ্বাসকষ্ট একদমই থাকে না, নাকি এটি প্রতিদিনের নিয়মিত সমস্যা?",
            "শ্বাসকষ্টের সাথে কি বুকে কোনো সাইঁ সাইঁ বা বাঁশির মতো শব্দ হয়?"
        ]
    },

    // --- CHEST PAIN ---
    {
        name: 'Chest Pain',
        keywords: 'chest pain, angina, seene mein dard, buke batha',
        questions: [
            "Exactly where in your chest is the pain? Does it travel to your back, neck, jaw, or arms?",
            "How does the pain feel? Is it a sharp, catching pain, a heavy pressure, or a burning sensation?",
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
            "दर्द कैसा महसूस होता है? क्या यह तेज़ चुभने वाला दर्द है, भारी दबाव है, या जलन का अहसास है?",
            "जब आप गहरी सांस लेते हैं या खांसते हैं, तो क्या दर्द तेज़ या खराब हो जाता है?",
            "जब आपको यह दर्द होता है, तो क्या आप पसीना, चक्कर आना या जी मिचलाना महसूस करते हैं?",
            "क्या यह दर्द शारीरिक परिश्रम से शुरू होता है और आराम करने पर ठीक हो जाता है?"
        ]
    },
    {
        name: 'Chest Pain (BN)',
        keywords: 'buke batha, buker dard, chest pain',
        questions: [
            "ঠিক আপনার বুকের কোথায় ব্যথা অনুভব করছেন? এটি কি আপনার পিঠ, ঘাড়, চোয়াল বা হাতে ছড়িয়ে পড়ে?",
            "ব্যথাটি কেমন লাগে? এটি কি তীক্ষ্ণ ব্যথা, নাকি কোনও ভারী চাপ বা জ্বালাপোড়া অনুভব করছেন?",
            "গভীর শ্বাস নিলে বা কাশলে কি ব্যথাটি আরও তীব্র হয়?",
            "যখন ব্যথা হয়, তখন কি আপনি ঘামছেন, মাথা ঘুরছে বা বমি বমি ভাব অনুভব করছেন?",
            "শারীরিক পরিশ্রম করলে কি এই ব্যথা শুরু হয় এবং বিশ্রাম নিলে কি কমে যায়?"
        ]
    },

    // --- FEVER ---
    {
        name: 'Fever',
        keywords: 'fever, temperature, bukhar, jwor',
        questions: [
            "Do you get the fever every day? Is it higher in the evenings or nights?",
            "Do you experience severe shivering (chills/rigors) or drenching sweats at night when the fever breaks?",
            "How many days have you had the fever, and have you checked the maximum temperature on a thermometer?",
            "Have you taken any medicines (like Paracetamol) and did the temperature come down?",
            "Are there any associated symptoms like a skin rash, joint pain, or severe headache?"
        ]
    },
    {
        name: 'Fever (HI)',
        keywords: 'bukhar, tap, thand, chills, fever',
        questions: [
            "क्या आपको रोज़ाना बुखार आता है? क्या यह शाम या रात के समय ज़्यादा होता है?",
            "क्या आपको बुखार उतरते समय तेज़ कंपकंपी (चिल्स/रिगर्स) या रात में पसीने का अहसास होता है?",
            "कितने दिनों से बुखार है, और क्या आपने थर्मामीटर पर अधिकतम तापमान चेक किया है?",
            "क्या आपने पैरासिटामोल जैसी दवा ली है और क्या उससे तापमान कम हुआ?",
            "क्या बुखार के साथ शरीर पर दाने, जोड़ों में दर्द या सिरदर्द है?"
        ]
    },
    {
        name: 'Fever (BN)',
        keywords: 'jwor, tap, jwar, thanda, chills, fever',
        questions: [
            "জ্বর কি প্রতিদিন আসছে? বিকেল বা রাতে কি এটি বেশী থাকে?",
            "জ্বর ছাড়ার সময় আপনার কি খুব কাঁপুনি হয় অথবা রাতে আপনি কি ভীষণভাবে ঘামেন?",
            "কত দিন ধরে আপনার জ্বর হয়েছে এবং আপনি কি থার্মোমিটার দিয়ে আপনার সর্বোচ্চ তাপমাত্রা পরীক্ষা করেছেন?",
            "আপনি কি প্যারাসিটামল জাতীয় কোনো ওষুধ খেয়েছেন এবং তাতে কি জ্বর কমেছে?",
            "জ্বরের সঙ্গে গায়ে কোনো ফুসকুড়ি, জয়েন্টে ব্যথা বা তীব্র মাথাব্যথা আছে কি?"
        ]
    },

    // --- ILD ---
    {
        name: 'Interstitial Lung Disease (ILD)',
        keywords: 'ild, fibrosis, scarring',
        questions: [
            "Do you have any severe joint pains, morning stiffness in your hands, or notice your fingers turning blue/white in the cold?",
            "Do you keep birds (like pigeons or parrots) at home, or are there many pigeons near your residence?",
            "Have you been exposed to stone dust, asbestos, or heavy mold? Do you use a room humidifier?",
            "Are you taking medications for heart rhythm (Amiodarone) or recurrent urinary infections?",
            "Has anyone in your immediate family been diagnosed with lung fibrosis or scarring?"
        ]
    },
    {
        name: 'Interstitial Lung Disease (ILD) (HI)',
        keywords: 'ild, fefde sikudna, fibrosis',
        questions: [
            "क्या आपको जोड़ों में तेज़ दर्द, सुबह हाथों में अकड़न महसूस होती है, या ठंड में आपकी उंगलियां नीली/सफेद पड़ जाती हैं?",
            "क्या आप घर में पक्षी पालते हैं (जैसे कबूतर या तोते), या आपके घर/बालकनी के पास बहुत सारे कबूतर हैं?",
            "क्या आप पत्थर की धूल, एस्बेस्टस, या मोल्ड के संपर्क में रहे हैं? क्या आप कमरे के ह्यूमिडिफायर का उपयोग करते हैं?",
            "क्या आप वर्तमान में ले रहे हैं या पहले ली हैं दिल की धड़कन (एमियोडेरोन) या बार-बार होने वाले मूत्र संक्रमण के लिए दवाएं?",
            "क्या आपके परिवार में किसी को फेफड़ों के फाइब्रोसिस (फेफड़ों का सिकुड़ना) की बीमारी हुई है?"
        ]
    },
    {
        name: 'Interstitial Lung Disease (ILD) (BN)',
        keywords: 'ild, phusphus shukie jaoa, payra',
        questions: [
            "আপনার কি গুরুতর জয়েন্টে ব্যথা, সকালে হাতে জড়তা বোধ হয়, অথবা শীতে আপনার আঙুলের ডগা নীল বা সাদা হয়ে যাওয়ার সমস্যা আছে?",
            "আপনার বাড়িতে কি কোনো পাখি (যেমন পায়রা বা টিয়া) আছে? অথবা আপনার বাড়ির কাছে কি প্রচুর পায়রা লক্ষ্য করেছেন?",
            "আপনি কি পাথরের ধুলোবালি, অ্যাসবেস্টস বা ভারী মো্ল্ড এর সংস্পর্শে ছিলেন? আপনি কি রুমে হিউমিডিফায়ার ব্যবহার করেন?",
            "আপনি কি হার্টের সমস্যার জন্য (অ্যামিওডারোন) অথবা বারবার মূত্রনালীর সংক্রমণের জন্য কোনো ওষুধ খাচ্ছেন বা খেয়েছেন?",
            "আপনার পরিবারের কেউ কি ফুসফুসের ফাইব্রোসিস বা স্কারিং রোগে আক্রান্ত হয়েছেন?"
        ]
    },

    // --- COPD ---
    {
        name: 'COPD',
        questions: [
            "Have you ever smoked cigarettes, bidis, or a hookah? If yes, how many per day and for how many years?",
            "Have you cooked meals indoors using a chulha (wood, coal, cow dung) without a chimney in the past?",
            "Have you worked in environments with heavy dust, chemicals, or fumes (mining, textiles, construction)?",
            "How many times in the last year have your chest symptoms worsened enough that you needed antibiotics or steroids?",
            "Do you have a persistent cough in the morning with significant phlegm production?"
        ]
    },
    {
        name: 'COPD (HI)',
        questions: [
            "क्या आपने कभी सिगरेट, बीड़ी या हुक्का पिया है? यदि हाँ, तो प्रतिदिन कितनी और कितने वर्षों तक?",
            "अतीत में या वर्तमान में, क्या आपने चिमनी के बिना चूल्हे (लकड़ी, कोयला या गोबर) का उपयोग करके घर के अंदर खाना बनाया है?",
            "क्या आपने भारी धूल, रसायनों या धुएं (जैसे खनन, कपड़ा, या निर्माण) वाले वातावरण में काम किया है?",
            "पिछले एक साल में आपकी छाती के लक्षण कितनी बार इतने खराब हुए हैं कि आपको एंटीबायोटिक्स या स्टेरॉयड की ज़रूरत पड़ी?",
            "क्या आपको सुबह उठने पर भारी बलगम के साथ लगातार खांसी होती है?"
        ]
    },
    {
        name: 'COPD (BN)',
        questions: [
            "আপনি কি কখনো সিগারেট, বিড়ি বা হুঁকা খেয়েছেন? যদি হ্যাঁ হয়, তবে দিনে কতবার এবং কত বছর খেয়েছেন?",
            "অতীতে বা বর্তমানে কি আপনি চিমনি ছাড়া ঘরে উনুনে (কাঠের বা ঘুঁটের আগুনের) রান্না করেছেন?",
            "বড় কোনো ধুলোবালি, রাসায়নিক বা ধোঁয়াটে পরিবেশে আপনি কি কাজ করেছেন (যেমন খনি, টেক্সটাইল বা নির্মাণ কাজ)?",
            "গত এক বছরে শ্বাসকষ্টের সমস্যা কতবার এত খারাপ হয়েছিল যে আপনার অ্যান্টিবায়োটিক বা স্টেরয়েডের প্রয়োজন হয়েছে?",
            "সকালে ঘুম থেকে ওঠার পর আপনার কি প্রচুর কফ সহ একটানা কাশি হয়?"
        ]
    },

    // --- ASTHMA ---
    {
        name: 'Asthma',
        questions: [
            "Do you have a history of frequent sneezing, runny nose, itchy eyes, or skin eczema?",
            "Do you frequently wake up between 2 AM and 5 AM because of a tight chest, wheezing, or coughing?",
            "Do your breathing symptoms improve on weekends or when you are away from your workplace?",
            "Have you ever noticed your breathing get worse after taking painkillers like Aspirin or Ibuprofen?",
            "Do you have a family history of asthma, hay fever, or other allergies?"
        ]
    },
    {
        name: 'Asthma (HI)',
        questions: [
            "क्या आपको बार-बार छींकने/नाक बहने, आँखों में खुजली या त्वचा के एक्जिमा की समस्या है?",
            "क्या आप अक्सर रात 2 बजे से सुबह 5 बजे के बीच सीने में जकड़न, घरघराहट या खांसी के कारण जाग जाते हैं?",
            "क्या सप्ताहांत पर या कार्यस्थल से दूर होने पर आपके सांस लेने के लक्षणों में सुधार होता है?",
            "क्या आपने कभी एस्पिरिन या इबुप्रोफेन जैसी पेनकिलर लेने के बाद अपनी सांस खराब होते हुए देखी है?",
            "क्या आपके परिवार में किसी को अस्थमा, हे फीवर या अन्य एलर्जी का इतिहास है?"
        ]
    },
    {
        name: 'Asthma (BN)',
        questions: [
            "আপনার কি ঘন ঘন হাঁচি/নাক দিয়ে জল পড়া, চোখে চুলকানি বা ত্বকে একজিমার সমস্যা আছে?",
            "বুকের জাঁকিয়ে ধরা, সাঁই সাঁই শব্দ হওয়া বা কাশির কারণে আপনি কি মাঝেমধ্যে রাত ২ থেকে ভোর ৫টার মধ্যে জেগে ওঠেন?",
            "আপনার শ্বাসকষ্টের লক্ষণগুলি কি ছুটির দিনে বা কর্মস্থল থেকে দূরে থাকলে ভালো থাকে?",
            "অ্যাস্পিরিন বা আইবুপ্রোফেন জাতীয় কোনো ব্যথানাশক ওষুধ খাওয়ার পর আপনার কি শ্বাস নিতে অসুবিধে হয়?",
            "আপনার কি পরিবারে হাঁপানি, হে ফিভার বা অন্য কোনো অ্যালার্জির ইতিহাস আছে?"
        ]
    },

    // --- TUBERCULOSIS (TB) ---
    {
        name: 'Tuberculosis (TB)',
        questions: [
            "Have you lost weight recently without trying? Do your clothes feel noticeably looser?",
            "Has anyone in your home, workplace, or close circle been treated for TB recently?",
            "Have you ever been diagnosed with TB in the past? Did you complete the full course of medications?",
            "Have you noticed any painless swellings in your neck or armpits, or severe, worsening back pain?",
            "Have you noticed a significant loss of appetite or a general feeling of being very unwell?"
        ]
    },
    {
        name: 'Tuberculosis (TB) (HI)',
        questions: [
            "क्या आपने हाल ही में बिना कोशिश किए वजन कम किया है? क्या आपके कपड़े पहले के मुकाबले ढीले महसूस होते हैं?",
            "क्या आपके घर, कार्यस्थल या करीबी सर्कल में किसी का हाल ही में टीबी का इलाज हुआ है?",
            "क्या आपको पहले कभी टीबी हुई है? यदि हाँ, तो क्या आपने दवाओं का पूरा कोर्स किया था?",
            "क्या आपने अपनी गर्दन या बगल में कोई दर्द रहित सूजन महसूस की है, या पीठ में तेज़ दर्द का अनुभव किया है?",
            "क्या आपको भूख में कमी महसूस हुई है या आप बहुत अस्वस्थ महसूस कर रहे हैं?"
        ]
    },
    {
        name: 'Tuberculosis (TB) (BN)',
        questions: [
            "ইদানিং কি আপনার ওজন বিনা কারণে কমে গেছে? কাপড় কি আগের চেয়ে অনেক ঢিলে হয়ে গেছে?",
            "আপনার বাড়িতে, কর্মস্থলে বা পরিচিত কেউ কি সম্প্রতি যক্ষ্মার চিকিৎসা নিয়েছেন?",
            "আপনার কি আগে কখনো যক্ষ্মা হয়েছে? যদি হ্যাঁ হয়, তবে আপনি কি ওষুধের পূর্ণ কোর্স শেষ করেছিলেন?",
            "আপনার ঘাড় বা বগলে কি ব্যথাহীন কোনও ফোলা ভাব লক্ষ্য করেছেন অথবা পিঠের তীব্র ব্যথায় ভুগছেন?",
            "আপনার কি খাওয়ার রুচি অনেক কমে গেছে বা শরীর ভীষণ খারাপ লাগছে?"
        ]
    }
];

const migrate = async () => {
    console.log("[Sync] Restoring Multilingual clinical templates...");
    const tenantIds = ['default-clinic-id', 'demo-tenant-id']; 

    try {
        for (const tenantId of tenantIds) {
            for (const t of templates) {
                const existing = await db.get("SELECT id FROM templates WHERE name = ? AND tenant_id = ?", [t.name, tenantId]);
                
                const questionsJson = JSON.stringify(t.questions);
                const keywords = t.keywords || t.name.toLowerCase();

                if (existing) {
                    await db.run("UPDATE templates SET questions = ?, trigger_keywords = ? WHERE id = ?", [questionsJson, keywords, existing.id]);
                } else {
                    await db.run("INSERT INTO templates (name, questions, trigger_keywords, tenant_id) VALUES (?, ?, ?, ?)", [t.name, questionsJson, keywords, tenantId]);
                }
            }
        }
        console.log("[Sync] Multilingual migration finished.");
    } catch (err) {
        console.error("[Sync] Migration failed:", err.message);
    }
};

module.exports = migrate;
