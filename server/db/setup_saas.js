/**
 * setup_saas.js — SaaS Multi-Tenant Schema Migration
 * 
 * Ensures tenants, users tables exist and all core tables have tenant_id.
 * Fully compatible with PostgreSQL and SQLite.
 * Safe to re-run — uses IF NOT EXISTS and ON CONFLICT DO NOTHING.
 */

const db = require('./database');

const setupSaaS = async () => {
    console.log('Starting SaaS schema migration...');

    // 1. Ensure tenants table exists
    await db.run(`CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        plan TEXT DEFAULT 'basic',
        created_at TIMESTAMP DEFAULT ${db.isPg ? 'NOW()' : 'CURRENT_TIMESTAMP'}
    )`);

    // 2. Ensure users table exists with composite unique constraint
    await db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT ${db.isPg ? 'NOW()' : 'CURRENT_TIMESTAMP'}
    )`);

    // 3. Add unique constraint on users(email, tenant_id) if not already there
    if (db.isPg) {
        await db.run(`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_indexes WHERE indexname = 'users_email_tenant_idx'
                ) THEN
                    CREATE UNIQUE INDEX users_email_tenant_idx ON users (email, tenant_id);
                END IF;
            END $$
        `);
    }

    // 4. Add tenant_id column to all core tables (safe — ignores if already exists)
    const coreTables = ['patients', 'sessions', 'templates', 'summaries', 'qa_pairs', 'documents'];
    for (const table of coreTables) {
        try {
            await db.run(`ALTER TABLE ${table} ADD COLUMN tenant_id TEXT`);
        } catch (err) {
            // Ignore "column already exists" errors from both PG and SQLite
            const isAlreadyExists = err.message && (
                err.message.includes('duplicate column name') || // SQLite
                err.message.includes('already exists')          // PostgreSQL
            );
            if (!isAlreadyExists) throw err;
        }
    }

    // 5. Ensure settings table has correct composite primary key schema
    //    In PostgreSQL we check information_schema; in SQLite we use PRAGMA.
    if (db.isPg) {
        const result = await db.get(`
            SELECT COUNT(*) as count
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'settings'
              AND tc.constraint_type = 'PRIMARY KEY'
              AND kcu.column_name = 'tenant_id'
        `);
        const hasCompositePK = result && parseInt(result.count) > 0;

        if (!hasCompositePK) {
            // Recreate settings with composite PK
            await db.run(`CREATE TABLE IF NOT EXISTS settings_new (
                key TEXT NOT NULL,
                value TEXT,
                tenant_id TEXT NOT NULL DEFAULT 'default-clinic-id',
                PRIMARY KEY (key, tenant_id)
            )`);
            try {
                await db.run(`INSERT INTO settings_new (key, value, tenant_id)
                    SELECT key, COALESCE(value, ''), COALESCE(tenant_id, 'default-clinic-id')
                    FROM settings
                    ON CONFLICT DO NOTHING`);
                await db.run(`DROP TABLE settings`);
                await db.run(`ALTER TABLE settings_new RENAME TO settings`);
                console.log('Settings table recreated with composite primary key (PG).');
            } catch (e) {
                // settings_new may already have been renamed — ignore
                if (!e.message.includes('does not exist')) console.warn(e.message);
            }
        }
    } else {
        // SQLite version
        const tableInfo = await db.all("PRAGMA table_info(settings)");
        const hasTenantId = tableInfo && tableInfo.some(r => r.name === 'tenant_id');
        const pkCount = tableInfo ? tableInfo.filter(r => r.pk > 0).length : 0;

        if (pkCount < 2) {
            await db.run(`CREATE TABLE IF NOT EXISTS settings_new (
                key TEXT,
                value TEXT,
                tenant_id TEXT DEFAULT 'default-clinic-id',
                PRIMARY KEY (key, tenant_id)
            )`);
            if (hasTenantId) {
                await db.run(`INSERT OR IGNORE INTO settings_new (key, value, tenant_id)
                    SELECT key, value, COALESCE(tenant_id, 'default-clinic-id') FROM settings`);
            } else {
                await db.run(`INSERT OR IGNORE INTO settings_new (key, value, tenant_id)
                    SELECT key, value, 'default-clinic-id' FROM settings`);
            }
            await db.run(`DROP TABLE settings`);
            await db.run(`ALTER TABLE settings_new RENAME TO settings`);
            console.log('Settings table recreated with composite primary key (SQLite).');
        }
    }

    // 6. Ensure default tenant exists
    const defaultTenantId = 'default-clinic-id';
    if (db.isPg) {
        await db.run(
            `INSERT INTO tenants (id, name, status) VALUES (?, ?, ?) ON CONFLICT (id) DO NOTHING`,
            [defaultTenantId, 'Default Clinic', 'active']
        );
    } else {
        await db.run(
            `INSERT OR IGNORE INTO tenants (id, name, status) VALUES (?, ?, ?)`,
            [defaultTenantId, 'Default Clinic', 'active']
        );
    }

    // 7. Assign default tenant_id to any orphaned rows
    for (const table of coreTables) {
        await db.run(`UPDATE ${table} SET tenant_id = ? WHERE tenant_id IS NULL`, [defaultTenantId]);
    }

    console.log('✓ SaaS migration completed.');
};

module.exports = setupSaaS;
