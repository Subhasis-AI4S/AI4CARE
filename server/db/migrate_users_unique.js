const db = require('./database');

const migrateUsersUnique = () => {
    console.log("Starting users table unique constraint migration...");
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // 1. Create new table with correct constraint
        db.run(`CREATE TABLE users_new (
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
        
        // 2. Copy data
        db.run('INSERT INTO users_new SELECT * FROM users', (err) => {
            if (err) {
                console.error("Failed to copy users data:", err.message);
                db.run('ROLLBACK');
                process.exit(1);
            }
        });
        
        // 3. Swap tables
        db.run('DROP TABLE users');
        db.run('ALTER TABLE users_new RENAME TO users');
        
        db.run('COMMIT', (err) => {
            if (err) {
                console.error("Migration failed:", err.message);
                process.exit(1);
            } else {
                console.log("Users table successfully updated with composite UNIQUE(email, tenant_id).");
                process.exit(0);
            }
        });
    });
};

migrateUsersUnique();
