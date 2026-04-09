const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const pgPool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const sqlitePath = path.join(__dirname, 'db', 'ai4care.db');
const sqliteDb = new sqlite3.Database(sqlitePath);

async function runAudit() {
    console.log('--- Deep Template Audit Starting ---');
    
    try {
        // 1. Probe SQLite Schema
        const sqliteSchema = await new Promise((resolve, reject) => {
            sqliteDb.all("PRAGMA table_info(templates)", (err, rows) => {
                if (err) reject(err);
                resolve(rows.map(r => r.name));
            });
        });
        console.log('SQLite Template Columns:', sqliteSchema.join(', '));

        // 2. Probe PG Schema
        const pgSchemaRes = await pgPool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'templates'
        `);
        const pgSchema = pgSchemaRes.rows.map(r => r.column_name);
        console.log('PostgreSQL Template Columns:', pgSchema.join(', '));

        // 3. Count SQLite Templates
        const sqliteRows = await new Promise((resolve, reject) => {
            sqliteDb.all("SELECT * FROM templates", (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
        console.log(`\nSQLite count: ${sqliteRows.length}`);

        // 4. Count PG Templates
        const pgRes = await pgPool.query("SELECT * FROM templates");
        console.log(`PostgreSQL count: ${pgRes.rowCount}`);

        // 5. Identify Missing
        const pgNames = new Set(pgRes.rows.map(r => r.name.toLowerCase()));
        const missing = sqliteRows.filter(r => !pgNames.has(r.name.toLowerCase()));

        if (missing.length > 0) {
            console.log('\n--- Missing Templates Found ---');
            missing.forEach(m => {
                console.log(`[MISSING] Name: "${m.name}" | Category: "${m.category || m.specialization || 'N/A'}"`);
            });
        } else {
            console.log('\nAll SQLite templates exist in PostgreSQL.');
        }

    } catch (err) {
        console.error('Audit crashed:', err.message);
    } finally {
        sqliteDb.close();
        await pgPool.end();
    }
}

runAudit();
