const db = require('./database');
const { hashPassword } = require('../utils/auth');
const crypto = require('crypto');

const seedDemoSaaS = async () => {
    try {
        console.log("Seeding Demo SaaS Data...");

        const tenantId = 'demo-tenant-id';
        const userId = 'demo-user-id';
        const hashedPassword = await hashPassword('demo123');

        // 1. Create Demo Tenant
        await new Promise((resolve, reject) => {
            db.run('INSERT OR IGNORE INTO tenants (id, name, status, plan) VALUES (?, ?, ?, ?)',
                [tenantId, 'Demo Healthcare Clinic', 'active', 'premium'], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
        });

        // 2. Create Demo Admin User
        await new Promise((resolve, reject) => {
            db.run('INSERT OR IGNORE INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, tenantId, 'demo@demo.com', hashedPassword, 'Dr. Demo Admin', 'admin'], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
        });

        // 3. Seed Settings for Demo Tenant
        const settings = [
            ['clinic_name', 'Demo Healthcare Clinic'],
            ['doctor_name', 'Dr. Demo Admin'],
            ['auto_save', 'true'],
            ['export_format', 'PDF']
        ];
        for (const [key, value] of settings) {
            await new Promise((resolve, reject) => {
                db.run('INSERT OR REPLACE INTO settings (key, value, tenant_id) VALUES (?, ?, ?)',
                    [key, value, tenantId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });
        }

        // 4. Seed Multilingual Patients
        const patients = [
            { id: 101, name: 'John Smith', age: 45, gender: 'Male', contact: '555-0101', lang: 'en', complaint: 'Chronic lower back pain for 3 months.' },
            { id: 102, name: 'Rahul Sharma', age: 38, gender: 'Male', contact: '555-0102', lang: 'hi', complaint: 'लगातार खांसी और हल्का बुखार।' },
            { id: 103, name: 'Aniruddha Biswas', age: 52, gender: 'Male', contact: '555-0103', lang: 'bn', complaint: 'বুকের মাঝখানে চাপ এবং শ্বাসকষ্ট।' }
        ];

        for (const p of patients) {
            await new Promise((resolve, reject) => {
                db.run('INSERT OR REPLACE INTO patients (id, name, age, gender, contact, tenant_id) VALUES (?, ?, ?, ?, ?, ?)',
                    [p.id, p.name, p.age, p.gender, p.contact, tenantId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });

            // Create a session for each patient
            const sessionId = p.id + 1000;
            await new Promise((resolve, reject) => {
                db.run('INSERT OR REPLACE INTO sessions (id, patient_id, complaint, status, tenant_id) VALUES (?, ?, ?, ?, ?)',
                    [sessionId, p.id, p.complaint, 'completed', tenantId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });

            // Add a summary for each session
            const summaries = {
                101: {
                    chief: 'Chronic Lower Back Pain',
                    hpi: 'Patient John Smith presents with chronic lower back pain localized to the lumbar region, persisting for 3 months. Pain is described as a dull ache, worsening after prolonged sitting.'
                },
                102: {
                    chief: 'Persistent Cough and Mild Fever',
                    hpi: 'Patient Rahul Sharma reports a persistent dry cough for the past week, accompanied by low-grade fever peaking at 100.2°F. No shortness of breath noted.'
                },
                103: {
                    chief: 'Chest Pressure and Dyspnea',
                    hpi: 'Patient Aniruddha Biswas complains of pressure-like chest pain and difficulty breathing that started 2 hours ago. Pain does not radiate to the jaw or arms.'
                }
            };

            const s = summaries[p.id];

            await new Promise((resolve, reject) => {
                db.run('INSERT OR REPLACE INTO summaries (session_id, chief_complaint, history_of_presenting_illness, key_findings, clinical_flags, assessment_notes, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [
                        sessionId, 
                        s.chief, 
                        s.hpi,
                        JSON.stringify(['Stable vitals mentioned by patient', 'No previous history of similar episodes']),
                        JSON.stringify(p.id === 103 ? ['CRITICAL: Rule out Acute Coronary Syndrome'] : []),
                        'Clinical investigation recommended.',
                        tenantId
                    ], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });
        }

        console.log("Demo SaaS Data Seeded Successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error.message);
        process.exit(1);
    }
};

seedDemoSaaS();
