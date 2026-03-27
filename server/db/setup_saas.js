const db = require('./database');

const runSql = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                console.error(`SQL Error: ${sql}`, err.message);
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
};

const setupSaaS = async () => {
    try {
        console.log("Starting SaaS migration with settings fix...");

        // 1. Tenants Table
        await runSql(`CREATE TABLE IF NOT EXISTS tenants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            plan TEXT DEFAULT 'basic',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // 2. Users Table
        await runSql(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            email TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            role TEXT DEFAULT 'staff',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(email, tenant_id),
            FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
        )`);

        // 3. Add tenant_id to all existing tables (except settings which we recreate)
        const tablesToMigrate = ['patients', 'sessions', 'templates', 'summaries', 'qa_pairs', 'documents'];
        for (const table of tablesToMigrate) {
            try {
                await runSql(`ALTER TABLE ${table} ADD COLUMN tenant_id TEXT`);
            } catch (err) {
                if (!err.message.includes('duplicate column name')) throw err;
            }
        }

        // 4. Special handling for Settings (Composite Primary Key)
        console.log("Migrating settings table to composite primary key...");
        const tableInfo = await new Promise((resolve) => {
            db.all("PRAGMA table_info(settings)", (err, rows) => resolve(rows));
        });
        
        const hasTenantId = tableInfo.some(r => r.name === 'tenant_id');
        const pkCount = tableInfo.filter(r => r.pk > 0).length;

        if (pkCount < 2) {
            // Recreate table
            await runSql(`CREATE TABLE settings_new (
                key TEXT,
                value TEXT,
                tenant_id TEXT,
                PRIMARY KEY (key, tenant_id)
            )`);
            
            // Backup old data
            if (hasTenantId) {
                await runSql(`INSERT INTO settings_new (key, value, tenant_id) SELECT key, value, tenant_id FROM settings`);
            } else {
                await runSql(`INSERT INTO settings_new (key, value, tenant_id) SELECT key, value, 'default-clinic-id' FROM settings`);
            }
            
            await runSql(`DROP TABLE settings`);
            await runSql(`ALTER TABLE settings_new RENAME TO settings`);
            console.log("Settings table recreated with composite primary key.");
        }

        // 5. Default Tenant
        const defaultTenantId = 'default-clinic-id';
        await runSql(`INSERT OR IGNORE INTO tenants (id, name, status) VALUES (?, ?, ?)`, 
            [defaultTenantId, 'Default Clinic', 'active']);

        // 6. Retroactive assignment
        for (const table of tablesToMigrate) {
            await runSql(`UPDATE ${table} SET tenant_id = ? WHERE tenant_id IS NULL`, [defaultTenantId]);
        }

        console.log("SaaS Migration Completed Successfully.");
    } catch (error) {
        console.error("Migration failed:", error.message);
        process.exit(1);
    }
};

setupSaaS().then(() => {
    process.exit(0);
});
