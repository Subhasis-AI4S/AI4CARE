const db = require('./database');
const fs = require('fs');
const path = require('path');

const setupDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create Patients table
      db.run(`
        CREATE TABLE IF NOT EXISTS patients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          age INTEGER NOT NULL,
          gender TEXT,
          contact TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Sessions table
      db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER,
          complaint TEXT,
          status TEXT DEFAULT 'in_progress', -- in_progress, completed, flagged
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (patient_id) REFERENCES patients (id)
        )
      `);

      // Create QA Pairs table
      db.run(`
        CREATE TABLE IF NOT EXISTS qa_pairs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          question TEXT,
          answer TEXT,
          order_index INTEGER,
          FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
        )
      `);

      // Create Documents table
      db.run(`
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          filename TEXT,
          file_path TEXT,
          coordinator_note TEXT,
          uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
        )
      `);

      // Create Summaries table
      db.run(`
        CREATE TABLE IF NOT EXISTS summaries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          chief_complaint TEXT,
          history_of_presenting_illness TEXT,
          key_findings TEXT, -- Stored as JSON string array
          clinical_flags TEXT, -- Stored as JSON string array
          assessment_notes TEXT,
          generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          edited_by_coordinator BOOLEAN DEFAULT 0,
          FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
        )
      `);

      // Create Templates table
      db.run(`
        CREATE TABLE IF NOT EXISTS templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          trigger_keywords TEXT,
          questions TEXT, -- Stored as JSON string array
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `, () => {
        resolve();
      });
    });
  });
};

const seedDatabase = async () => {
    // Check if templates exist, if not seed
    db.get('SELECT COUNT(*) as count FROM templates', (err, row) => {
        if (err) return console.error(err);
        if (row.count === 0) {
            const templates = [
                { name: 'Chest Pain', keywords: 'chest, pain, heavy, pressure, tight', questions: JSON.stringify(['When did the chest pain start?', 'How would you describe the pain (e.g., sharp, dull, heavy, tight)?', 'Does the pain radiate anywhere else, like your arm, neck, or jaw?', 'What makes the pain worse or better?', 'Are you experiencing any shortness of breath or sweating?']) },
                { name: 'Breathlessness', keywords: 'breath, short of breath, gasping, wheeze', questions: JSON.stringify(['When did you first notice the shortness of breath?', 'Does it happen at rest or with exertion?', 'Have you had a cough, fever, or wheezing associated with it?', 'Do you have a history of asthma or heart problems?', 'What makes the breathing easier or harder?']) },
                { name: 'Cough', keywords: 'cough, phlegm, sputum, coughing', questions: JSON.stringify(['How long have you had this cough?', 'Is it a dry cough, or are you bringing up phlegm/mucus?', 'If there is phlegm, what color is it?', 'Do you have any fever, chills, or weight loss?', 'Does the cough get worse at night or in cold air?']) },
                { name: 'Fever', keywords: 'fever, hot, chills, shivering, temp', questions: JSON.stringify(['When did the fever start and how high has it been?', 'Are you experiencing chills or night sweats?', 'Do you have any other symptoms like a headache, sore throat, or cough?', 'Have you taken any medication for the fever, and did it help?', 'Have you traveled recently or been around anyone sick?']) },
                { name: 'Headache', keywords: 'head, ache, migraine, throbbing', questions: JSON.stringify(['When did this headache start and how often do you get them?', 'How severe is the pain on a scale of 1-10?', 'Where exactly is the pain located?', 'Are there any associated symptoms like nausea, vomiting, or sensitivity to light?', 'What medications have you tried, and do they relieve the pain?']) },
                { name: 'Abdominal Pain', keywords: 'stomach, tummy, pain, cramp, ache', questions: JSON.stringify(['Where exactly is the pain located in your abdomen?', 'When did the pain start and is it constant or does it come and go?', 'How would you describe the pain (e.g., sharp, crampy, dull)?', 'Are you experiencing any nausea, vomiting, or changes in your bowel movements?', 'Does eating or certain movements make the pain worse or better?']) },
                
                // --- MULTILINGUAL & TRANSLITERATED ---
                { name: 'Fever (HI)', keywords: 'fever, bukhar, tap, hot, garam, thand, chills', questions: JSON.stringify(["यह बुखार पहली बार कब शुरू हुआ?", "क्या आपको कंपकंपी या रात को पसीना आता है?", "क्या आपको सिरदर्द, गले में खराश या खांसी जैसे कोई अन्य लक्षण हैं?", "क्या आपने बुखार के लिए कोई दवा ली है, और क्या उससे मदद मिली?", "क्या आपने हाल ही में यात्रा की है या किसी बीमार व्यक्ति के आसपास रहे हैं?"]) },
                { name: 'Cough (HI)', keywords: 'cough, khansi, balgam, phlegm, sputum', questions: JSON.stringify(["आपको यह खांसी कितने समय से है?", "क्या यह सूखी खांसी है, या आपको बलगम आ रहा है?", "यदि बलगम है, तो उसका रंग क्या है?", "क्या आपको बुखार, ठंड लगना या वजन कम होना महसूस हो रहा है?", "क्या खांसी रात में या ठंडी हवा में ज्यादा खराब हो जाती है?"]) },
                { name: 'Chest Pain (HI)', keywords: 'chest pain, seene mein dard, dil ka dard, pressure, heaviness, bhari pan', questions: JSON.stringify(["सीने में दर्द कब शुरू हुआ?", "आप दर्द का वर्णन कैसे करेंगे (जैसे कि तेज, हल्का, भारी, जकड़न)?", "क्या दर्द कहीं और फैलता है, जैसे आपके हाथ, गर्दन या जबड़े में?", "किस चीज़ से दर्द ज्यादा या कम होता है?", "क्या आपको सांस की तकलीफ या पसीना आ रहा है?"]) },
                { name: 'Fever (BN)', keywords: 'fever, jor, tap, gorom, thanda, chills', questions: JSON.stringify(["এই জ্বর প্রথম কবে শুরু হয়েছিল?", "আপনার কি কাঁপুনি বা রাতে ঘাম হচ্ছে?", "মাথাব্যথা, গলা ব্যথা বা কাশির মতো অন্য কোনো উপসর্গ আছে কি?", "আপনি কি জ্বরের জন্য কোনো ওষুধ খেয়েছেন, এবং তাতে কি কোনো কাজ হয়েছে?", "আপনি কি সম্প্রতি কোথাও ভ্রমণ করেছেন বা কোনো অসুস্থ ব্যক্তির সংস্পর্শে এসেছেন?"]) },
                { name: 'Cough (BN)', keywords: 'cough, kashi, kof, phlegm, sputum', questions: JSON.stringify(["আপনার এই কাশি কতদিন ধরে হচ্ছে?", "এটি কি শুকনো কাশি, নাকি আপনার কফ/শ্লেষ্মা উঠছে?", "যদি কফ থাকে তবে তার রঙ কী?", "আপনার কি জ্বর, কাঁপুনি বা ওজন কমার মতো কোনো সমস্যা আছে?", "কাশি কি রাতে বা ঠান্ডা বাতাসে আরও বেড়ে যায়?"]) },
                { name: 'Chest Pain (BN)', keywords: 'chest pain, buke batha, pressure, bhari bhab, heaviness', questions: JSON.stringify(["বুকে ব্যথা কবে শুরু হয়েছিল?", "ব্যথাটি কেমন (যেমন- তীব্র, হালকা, ভারী, নাকি চাপ ধরা)?", "ব্যথা কি অন্য কোথাও ছড়িয়ে পড়ে, যেমন- আপনার হাত, ঘাড় বা চোয়ালে?", "কী করলে ব্যথা বেশি বা কম হয়?", "আপনার কি শ্বাসকষ্ট বা ঘাম হচ্ছে?"]) }
            ];

            const stmt = db.prepare('INSERT INTO templates (name, trigger_keywords, questions) VALUES (?, ?, ?)');
            templates.forEach(t => {
                stmt.run([t.name, t.keywords, t.questions]);
            });
            stmt.finalize();
            console.log('Seeded templates.');
        }
    });

    // Check if settings exist
    db.get('SELECT COUNT(*) as count FROM settings', (err, row) => {
        if (err) return console.error(err);
        if (row.count === 0) {
            const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
            stmt.run(['clinic_name', 'AI4CARE Clinic']);
            stmt.run(['doctor_name', 'Dr. Smith']);
            stmt.run(['gemini_api_key', '']);
            stmt.run(['auto_save', 'true']);
            stmt.run(['export_format', 'PDF']);
            stmt.finalize();
            console.log('Seeded settings.');
        }
    });

    // Check if patients exist
    db.get('SELECT COUNT(*) as count FROM patients', (err, row) => {
        if (err) return console.error(err);
        if (row.count === 0) {
            // Seed a few dummy patients and sessions
            const insertPatient = `INSERT INTO patients (name, age, gender, contact) VALUES (?, ?, ?, ?)`;
            db.run(insertPatient, ['John Doe', 45, 'Male', '555-0101'], function(err) {
                if (err) return console.error(err);
                const patientId = this.lastID;
                const insertSession = `INSERT INTO sessions (patient_id, complaint, status) VALUES (?, ?, ?)`;
                db.run(insertSession, [patientId, 'I have been having this heavy chest pain since morning.', 'completed'], function(err) {
                    if (err) return console.error(err);
                    const sessionId = this.lastID;
                    
                    // Add QA Pairs
                    const qaStmt = db.prepare('INSERT INTO qa_pairs (session_id, question, answer, order_index) VALUES (?, ?, ?, ?)');
                    qaStmt.run([sessionId, 'When did the chest pain start?', 'About 8 AM this morning.', 0]);
                    qaStmt.run([sessionId, 'How would you describe the pain?', 'It feels like a heavy weight on my chest.', 1]);
                    qaStmt.run([sessionId, 'Does the pain radiate anywhere else?', 'Yes, slightly to my left arm.', 2]);
                    qaStmt.finalize();

                    // Add Summary
                    const summaryStmt = db.prepare('INSERT INTO summaries (session_id, chief_complaint, history_of_presenting_illness, key_findings, clinical_flags, assessment_notes) VALUES (?, ?, ?, ?, ?, ?)');
                    summaryStmt.run([
                        sessionId, 
                        'Chest pain radiating to left arm.', 
                        'The patient is a 45-year-old male presenting with a sudden onset of heavy chest pain that began at approximately 8:00 AM today. He describes the pain as a "heavy weight" on his chest, which slightly radiates to his left arm. No other associated symptoms were reported in the brief intake.',
                        JSON.stringify(['Heavy chest pain onset 8 AM', 'Radiating to left arm']),
                        JSON.stringify(['Radiating chest pain - requires immediate attention']),
                        'Possible cardiac event. Needs ECG stat.'
                    ]);
                    summaryStmt.finalize();
                });
            });

             db.run(insertPatient, ['Jane Smith', 32, 'Female', '555-0102'], function(err) {
                 if (err) return console.error(err);
                 const patientId = this.lastID;
                 const insertSession = `INSERT INTO sessions (patient_id, complaint, status) VALUES (?, ?, ?)`;
                 // Create a session a few days ago
                 const pastDate = new Date();
                 pastDate.setDate(pastDate.getDate() - 2);
                 const dateStr = pastDate.toISOString();

                 db.run(insertSession, [patientId, 'Frequent coughing for the past two weeks.', 'completed'], function(err) {
                    if (err) return console.error(err);
                    const sessionId = this.lastID;
                    db.run(`UPDATE sessions SET created_at = ? WHERE id = ?`, [dateStr, sessionId]);

                    const summaryStmt = db.prepare('INSERT INTO summaries (session_id, chief_complaint, history_of_presenting_illness, key_findings, clinical_flags, assessment_notes, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
                    summaryStmt.run([
                        sessionId, 
                        'Persistent cough for 2 weeks.', 
                        '32yo female with a 2-week history of persistent cough. Describes it as dry. Worse at night. No fever.',
                        JSON.stringify(['2 week dry cough', 'Worse at night']),
                        JSON.stringify([]),
                        'Likely viral or allergic. Prescribe suppressants.',
                        dateStr
                    ]);
                    summaryStmt.finalize();
                 });

                 db.run(insertSession, [patientId, 'Follow up for the cough.', 'flagged'], function(err) {
                    if (err) return console.error(err);
                    const sessionId = this.lastID;
                    db.run(`UPDATE sessions SET created_at = ? WHERE id = ?`, [new Date().toISOString(), sessionId]);

                    const summaryStmt = db.prepare('INSERT INTO summaries (session_id, chief_complaint, history_of_presenting_illness, key_findings, clinical_flags, assessment_notes) VALUES (?, ?, ?, ?, ?, ?)');
                    summaryStmt.run([
                        sessionId, 
                        'Cough not improving, now has mild fever.', 
                        'Follow up visit. Cough persists and patient now reports a low-grade fever starting yesterday. Sputum is slightly yellow.',
                        JSON.stringify(['Persistent cough', 'New onset low-grade fever', 'Yellow sputum']),
                        JSON.stringify(['Fever with prolonged cough']),
                        'Review for possible secondary bacterial infection.'
                    ]);
                    summaryStmt.finalize();
                 });
             });

            console.log('Seeded patients and sessions.');
        }
    });
};

setupDatabase().then(() => {
    console.log('Database schema created.');
    seedDatabase();
});
