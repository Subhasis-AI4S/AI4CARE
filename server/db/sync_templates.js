const db = require('./database');

const templatesToUpdate = [
    {
        name: 'Cough',
        keywords: 'cough, khansi, phlegm, cough out, sputum',
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
        name: 'Breathlessness (Dyspnea)',
        keywords: 'breathlessness, dampa, shortness of breath, breathing difficulty, dyspnea',
        questions: [
            "How long have you felt breathless, and has it been getting worse over time?",
            "How much activity makes you breathless? (e.g., strenuous exercise, walking on level ground, or even just dressing?)",
            "Do you wake up at night short of breath (PND)? Do you need to prop yourself up with multiple pillows to sleep (Orthopnea)?",
            "Are there days when your breathing is completely fine, or is it a constant daily struggle?",
            "Is the breathlessness accompanied by any wheezing or whistling sound from the chest?"
        ]
    },
    {
        name: 'Chest Pain',
        keywords: 'chest pain, chest discomfort, thoracic pain, angina',
        questions: [
            "Exactly where in your chest is the pain? Does it travel to your back, neck, jaw, or arms?",
            "How does the pain feel? Is it a sharp pain, a heavy pressure, or a burning sensation?",
            "Does the pain get sharper or worse when you take a deep breath or cough?",
            "When you have this pain, do you also feel sweaty, dizzy, or nauseous?",
            "Is the pain brought on by physical exertion and relieved by rest?"
        ]
    },
    {
        name: 'Blood in Sputum (Hemoptysis)',
        keywords: 'hemoptysis, blood in cough, coughing blood, red sputum',
        questions: [
            "Is it just a few streaks of blood in your phlegm, or are you coughing up spoonfuls of pure blood?",
            "Does the blood come up with a cough, or do you feel it coming from the back of your nose, or are you vomiting it up?",
            "Is the blood bright red and frothy, or dark and clotted?",
            "Have you noticed any recent weight loss, fever, or night sweats along with this?",
            "Have you had a recent severe chest infection or been diagnosed with any lung condition before?"
        ]
    },
    {
        name: 'Fever',
        keywords: 'fever, bukhar, temperature, chills, rigors',
        questions: [
            "Do you get the fever every day? Is it higher in the evenings or nights?",
            "Do you experience severe shivering (chills/rigors) or drenching sweats at night when the fever breaks?",
            "How many days have you had the fever, and have you checked the maximum temperature on a thermometer?",
            "Have you taken any medicines (like Paracetamol) and did the temperature come down?",
            "Are there any associated symptoms like a skin rash, joint pain, or severe headache?"
        ]
    },
    {
        name: 'Interstitial Lung Disease (ILD)',
        keywords: 'ild, lung fibrosis, scarring, interstitial',
        questions: [
            "Do you have any severe joint pains, morning stiffness in your hands, or notice your fingers turning blue/white in the cold?",
            "Do you keep birds (like pigeons or parrots) at home, or are there many pigeons near your residence?",
            "Have you been exposed to stone dust, asbestos, or heavy mold? Do you use a room humidifier?",
            "Are you taking medications for heart rhythm (Amiodarone) or recurrent urinary infections?",
            "Has anyone in your immediate family been diagnosed with lung fibrosis or scarring?"
        ]
    },
    {
        name: 'Chronic Obstructive Pulmonary Disease (COPD)',
        keywords: 'copd, emphysema, chronic bronchitis, smoker cough',
        questions: [
            "Have you ever smoked cigarettes, bidis, or a hookah? If yes, how many per day and for how many years?",
            "Have you cooked meals indoors using a chulha (wood, coal, cow dung) without a chimney in the past?",
            "Have you worked in environments with heavy dust, chemicals, or fumes (mining, textiles, construction)?",
            "How many times in the last year have your chest symptoms worsened enough that you needed antibiotics or steroids?",
            "Do you have a persistent cough in the morning with significant phlegm production?"
        ]
    },
    {
        name: 'Asthma',
        keywords: 'asthma, wheezing, tight chest, inhaler',
        questions: [
            "Do you have a history of frequent sneezing, runny nose, itchy eyes, or skin eczema?",
            "Do you frequently wake up between 2 AM and 5 AM because of a tight chest, wheezing, or coughing?",
            "Do your breathing symptoms improve on weekends or when you are away from your workplace?",
            "Have you ever noticed your breathing get worse after taking painkillers like Aspirin or Ibuprofen?",
            "Do you have a family history of asthma, hay fever, or other allergies?"
        ]
    },
    {
        name: 'Tuberculosis (TB)',
        keywords: 'tb, tuberculosis, weight loss, night sweat, neck swelling',
        questions: [
            "Have you lost weight recently without trying? Do your clothes feel noticeably looser?",
            "Has anyone in your home, workplace, or close circle been treated for TB recently?",
            "Have you ever been diagnosed with TB in the past? Did you complete the full course of medications?",
            "Have you noticed any painless swellings in your neck or armpits, or severe, worsening back pain?",
            "Have you noticed a significant loss of appetite or a general feeling of being very unwell?"
        ]
    },
    {
        name: 'Lung Cancer',
        keywords: 'lung cancer, hoarseness, persistent cough, swallowing difficulty',
        questions: [
            "Have you noticed any change in your voice (hoarseness) that hasn't gone away for weeks?",
            "Have you had any swelling in your face or neck, or difficulty swallowing food?",
            "Are you experiencing any new, constant bone pain, or frequent, unexplained headaches?",
            "Even if you don't smoke, have you lived or worked closely with someone who smoked heavily indoors?",
            "Have you felt persistently tired or noticed you are looking more pale than usual recently?"
        ]
    }
];

async function syncTemplates() {
    console.log("[Sync] Starting clinical template synchronization...");
    for (const t of templatesToUpdate) {
        try {
            // Find by exact name OR if the name is contained in trigger keywords to avoid duplication
            const existing = await db.get("SELECT id FROM templates WHERE name = ? OR trigger_keywords LIKE ?", [t.name, `%${t.name.toLowerCase()}%`]);
            
            if (existing) {
                console.log(`[Sync] Updating clinical template: ${t.name}`);
                await db.run("UPDATE templates SET questions = ?, trigger_keywords = ? WHERE id = ?", [JSON.stringify(t.questions), t.keywords, existing.id]);
            } else {
                console.log(`[Sync] Provisioning new clinical template: ${t.name}`);
                // Note: We omit 'id' to let SQLite/PostgreSQL handle auto-increment/serial properly
                await db.run("INSERT INTO templates (name, questions, trigger_keywords, tenant_id) VALUES (?, ?, ?, ?)", [
                    t.name,
                    JSON.stringify(t.questions),
                    t.keywords,
                    'demo-tenant-id' // Default tenant assignment
                ]);
            }
        } catch (e) {
            console.error(`[Sync] Failed to sync ${t.name}:`, e.message);
        }
    }
    console.log("[Sync] Clinical template synchronization finished.");
}

module.exports = syncTemplates;
