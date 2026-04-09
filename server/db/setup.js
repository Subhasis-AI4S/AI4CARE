/**
 * setup.js — AI4CARE Database Schema Initialization
 * 
 * Works with both SQLite (local dev) and PostgreSQL (production).
 * Uses the unified db adapter from database.js.
 * Safe to run multiple times — all tables use CREATE TABLE IF NOT EXISTS.
 */

const db = require('./database');

const setupDatabase = async () => {
    const pk = db.isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const now = db.isPg ? 'NOW()' : 'CURRENT_TIMESTAMP';

    // Patients
    await db.run(`CREATE TABLE IF NOT EXISTS patients (
        id ${pk},
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT,
        contact TEXT,
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT ${now}
    )`);

    // Sessions
    await db.run(`CREATE TABLE IF NOT EXISTS sessions (
        id ${pk},
        patient_id INTEGER,
        complaint TEXT,
        status TEXT DEFAULT 'in_progress',
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT ${now},
        updated_at TIMESTAMP DEFAULT ${now}
    )`);

    // QA Pairs
    await db.run(`CREATE TABLE IF NOT EXISTS qa_pairs (
        id ${pk},
        session_id INTEGER,
        question TEXT,
        answer TEXT,
        order_index INTEGER,
        tenant_id TEXT
    )`);

    // Documents
    await db.run(`CREATE TABLE IF NOT EXISTS documents (
        id ${pk},
        session_id INTEGER,
        filename TEXT,
        file_path TEXT,
        coordinator_note TEXT,
        tenant_id TEXT,
        uploaded_at TIMESTAMP DEFAULT ${now}
    )`);

    // Summaries
    await db.run(`CREATE TABLE IF NOT EXISTS summaries (
        id ${pk},
        session_id INTEGER,
        chief_complaint TEXT,
        history_of_presenting_illness TEXT,
        key_findings TEXT,
        clinical_flags TEXT,
        assessment_notes TEXT,
        suggested_medications TEXT,
        suggested_tests TEXT,
        tenant_id TEXT,
        generated_at TIMESTAMP DEFAULT ${now},
        edited_by_coordinator BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT ${now}
    )`);

    // Templates
    await db.run(`CREATE TABLE IF NOT EXISTS templates (
        id ${pk},
        name TEXT NOT NULL,
        trigger_keywords TEXT,
        questions TEXT,
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT ${now}
    )`);

    // Tenants (SaaS multi-tenancy)
    await db.run(`CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        plan TEXT DEFAULT 'basic',
        created_at TIMESTAMP DEFAULT ${now}
    )`);

    // Users
    await db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT ${now}
    )`);

    // Unique constraint on users — safe to run even if index already exists
    try {
        if (db.isPg) {
            await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_tenant_idx ON users (email, tenant_id)`);
        }
    } catch (e) { /* index already exists — fine */ }

    // Settings — composite primary key (key + tenant_id)
    await db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT NOT NULL,
        value TEXT,
        tenant_id TEXT NOT NULL DEFAULT 'default-clinic-id',
        PRIMARY KEY (key, tenant_id)
    )`);

    console.log('✓ Database schema initialized.');
};

const seedDatabase = async () => {
    try {
        // Seed default tenant
        const defaultTenantId = 'default-clinic-id';
        const tenantConflict = db.isPg ? 'ON CONFLICT (id) DO NOTHING' : 'OR IGNORE';
        await db.run(`INSERT ${db.isPg ? '' : 'OR IGNORE'} INTO tenants (id, name, status) VALUES (?, ?, ?)${db.isPg ? ' ON CONFLICT (id) DO NOTHING' : ''}`,
            [defaultTenantId, 'Default Clinic', 'active']);

        // Seed basic settings if empty
        const settingsRow = await db.get('SELECT COUNT(*) as count FROM settings WHERE tenant_id = ?', [defaultTenantId]);
        if (settingsRow && parseInt(settingsRow.count) === 0) {
            const defaults = [
                ['clinic_name', 'AI4CARE Clinic'],
                ['doctor_name', 'Doctor'],
                ['gemini_api_key', ''],
                ['auto_save', 'true'],
                ['export_format', 'PDF'],
                ['specialization', ''],
                ['clinic_address', ''],
                ['clinic_email', ''],
                ['clinic_phone', ''],
            ];
            for (const [key, value] of defaults) {
                const conflict = db.isPg ? 'ON CONFLICT (key, tenant_id) DO NOTHING' : 'OR IGNORE';
                await db.run(`INSERT ${db.isPg ? '' : 'OR IGNORE'} INTO settings (key, value, tenant_id) VALUES (?, ?, ?)${db.isPg ? ' ON CONFLICT (key, tenant_id) DO NOTHING' : ''}`,
                    [key, value, defaultTenantId]);
            }
            console.log('✓ Default settings seeded.');
        }
    } catch (e) {
        console.error('Seed warning:', e.message);
    }
};

(async () => {
    try {
        await setupDatabase();
        await seedDatabase();
    } catch (err) {
        console.error('Setup failed:', err.message);
    }
})();

module.exports = async function setup() {
    await setupDatabase();
    await seedDatabase();
};
