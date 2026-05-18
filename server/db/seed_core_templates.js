const db = require('./database');

const coreTemplates = [
    {
        name: "Common Cold",
        keywords: "cold, sneezing, runny nose, congestion",
        questions: [
            "How long have you had this cold?",
            "Do you have a sore throat or cough?",
            "Is there any nasal discharge, and what color is it?",
            "Have you noticed any facial pain or pressure?",
            "Are you experiencing any mild fever or body aches?"
        ]
    },
    {
        name: "Fever",
        keywords: "fever, high temperature, chills, sweating",
        questions: [
            "What was your highest recorded temperature?",
            "Are you experiencing any chills or excessive sweating?",
            "Do you have any other symptoms like a headache or cough?",
            "How long has the fever been present?",
            "Is the fever continuous or does it come and go?"
        ]
    },
    {
        name: "Headache",
        keywords: "headache, head pain, migraine, tension",
        questions: [
            "Where exactly in your head is the pain located?",
            "How would you describe the pain (throbbing, dull, sharp)?",
            "Are you sensitive to light or loud noises?",
            "Did the headache start suddenly or gradually?",
            "Is it accompanied by any nausea or vision changes?"
        ]
    },
    {
        name: "Cough",
        keywords: "cough, coughing, chest congestion",
        questions: [
            "Is the cough dry or are you bringing up phlegm?",
            "What color is the phlegm, if any?",
            "Is the cough worse at night or after exercise?",
            "Have you noticed any shortness of breath or wheezing?",
            "Does your chest feel tight or painful when you cough?"
        ]
    },
    {
        name: "Abdominal Pain",
        keywords: "stomach ache, abdominal pain, cramps, bloating",
        questions: [
            "Where exactly is the pain in your abdomen?",
            "Is the pain constant or does it come in waves?",
            "Are you experiencing any nausea, vomiting, or diarrhea?",
            "Have you noticed any changes in your appetite?",
            "Does eating make the pain better or worse?"
        ]
    }
];

async function seedCoreTemplates() {
    try {
        console.log("Seeding core clinical templates...");
        const defaultTenantId = 'default-clinic-id';

        for (const t of coreTemplates) {
            const conflict = db.isPg ? 'ON CONFLICT (name, tenant_id) DO NOTHING' : '';
            // Just use a simple check for SQLite to avoid complex ON CONFLICT
            const existing = await db.get("SELECT id FROM templates WHERE name = ? AND tenant_id = ?", [t.name, defaultTenantId]);
            
            if (!existing) {
                await db.run(
                    "INSERT INTO templates (name, trigger_keywords, questions, tenant_id) VALUES (?, ?, ?, ?)",
                    [t.name, t.keywords, JSON.stringify(t.questions), defaultTenantId]
                );
                console.log(`Added template: ${t.name}`);
            } else {
                console.log(`Template already exists: ${t.name}`);
            }
        }
        console.log("Core templates seeded successfully.");
    } catch (err) {
        console.error("Error seeding core templates:", err);
    } finally {
        process.exit(0);
    }
}

seedCoreTemplates();
