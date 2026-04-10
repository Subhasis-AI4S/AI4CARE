/**
 * migrate_sqlite_to_pg.js — One-Time Data Migration
 *
 * Copies all data from the local SQLite database (ai4care.db) into PostgreSQL.
 * Safe to run multiple times — uses ON CONFLICT DO NOTHING on all inserts.
 *
 * Usage:
 *   node server/db/migrate_sqlite_to_pg.js
 *
 * Prerequisites:
 *   - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD must be set in server/.env
 *   - PostgreSQL database must exist and schema must be initialized (run setup.js first)
 *   - SQLite file must exist at server/db/ai4care.db
 */

'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Load env from server/.env (script can be run from any directory)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

// ── Configuration ──────────────────────────────────────────────────────────

const SQLITE_PATH = path.join(__dirname, 'ai4care.db');

const pgPool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Read all rows from a SQLite table.
 */
function sqliteAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
}

/**
 * Insert a row into PostgreSQL using ON CONFLICT DO NOTHING.
 * Converts ? placeholders to $1, $2, etc.
 */
async function pgInsert(client, sql, values) {
    let i = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++i}`);
    await client.query(pgSql + ' ON CONFLICT DO NOTHING', values);
}

/**
 * Reset a PostgreSQL SERIAL sequence to MAX(id) + 1 for the given table.
 */
async function resetSequence(client, table) {
    try {
        await client.query(
            `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`
        );
    } catch (e) {
        // Table might use TEXT primary keys (tenants, users) — no sequence needed
    }
}

// ── Migration Tables (ordered by foreign key dependency) ──────────────────

const MIGRATION_ORDER = [
    'tenants',
    'users',
    'patients',
    'sessions',
    'qa_pairs',
    'documents',
    'summaries',
    'templates',
    'settings',
];

// Column definitions for each table insert
const TABLE_INSERT_SQL = {
    tenants:
        'INSERT INTO tenants (id, name, status, plan, created_at) VALUES (?, ?, ?, ?, ?)',
    users:
        'INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    patients:
        'INSERT INTO patients (id, name, age, gender, contact, tenant_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    sessions:
        'INSERT INTO sessions (id, patient_id, complaint, status, tenant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    qa_pairs:
        'INSERT INTO qa_pairs (id, session_id, question, answer, order_index, tenant_id) VALUES (?, ?, ?, ?, ?, ?)',
    documents:
        'INSERT INTO documents (id, session_id, filename, file_path, coordinator_note, tenant_id, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    summaries:
        'INSERT INTO summaries (id, session_id, chief_complaint, history_of_presenting_illness, key_findings, clinical_flags, assessment_notes, tenant_id, generated_at, edited_by_coordinator) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    templates:
        'INSERT INTO templates (id, name, trigger_keywords, questions, tenant_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    settings:
        'INSERT INTO settings (key, value, tenant_id) VALUES (?, ?, ?)',
};

const TABLE_SELECT_SQL = {
    tenants: 'SELECT id, name, status, plan, created_at FROM tenants',
    users: 'SELECT id, tenant_id, email, password_hash, full_name, role, created_at FROM users',
    patients: 'SELECT id, name, age, gender, contact, tenant_id, created_at FROM patients',
    sessions: 'SELECT id, patient_id, complaint, status, tenant_id, created_at, updated_at FROM sessions',
    qa_pairs: 'SELECT id, session_id, question, answer, order_index, tenant_id FROM qa_pairs',
    documents: 'SELECT id, session_id, filename, file_path, coordinator_note, tenant_id, uploaded_at FROM documents',
    summaries: 'SELECT id, session_id, chief_complaint, history_of_presenting_illness, key_findings, clinical_flags, assessment_notes, generated_at, edited_by_coordinator, tenant_id FROM summaries',
    templates: 'SELECT id, name, trigger_keywords, questions, tenant_id, created_at FROM templates',
    settings: 'SELECT key, value, tenant_id FROM settings',
};

function rowToValues(table, row) {
    switch (table) {
        case 'tenants': return [row.id, row.name, row.status, row.plan, row.created_at];
        case 'users': return [row.id, row.tenant_id, row.email, row.password_hash, row.full_name, row.role, row.created_at];
        case 'patients': return [row.id, row.name, row.age, row.gender, row.contact, row.tenant_id, row.created_at];
        case 'sessions': return [row.id, row.patient_id, row.complaint, row.status, row.tenant_id, row.created_at, row.updated_at];
        case 'qa_pairs': return [row.id, row.session_id, row.question, row.answer, row.order_index, row.tenant_id];
        case 'documents': return [row.id, row.session_id, row.filename, row.file_path, row.coordinator_note, row.tenant_id, row.uploaded_at];
        case 'summaries': return [row.id, row.session_id, row.chief_complaint, row.history_of_presenting_illness, row.key_findings, row.clinical_flags, row.assessment_notes, row.tenant_id, row.generated_at, row.edited_by_coordinator ? true : false];
        case 'templates': return [row.id, row.name, row.trigger_keywords, row.questions, row.tenant_id, row.created_at];
        case 'settings': return [row.key, row.value, row.tenant_id || 'default-clinic-id'];
        default: return [];
    }
}

// ── Main Migration ─────────────────────────────────────────────────────────

async function migrate() {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║     AI4CARE: SQLite → PostgreSQL Data Migration     ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    // Validate PG connection
    let pgClient;
    try {
        pgClient = await pgPool.connect();
        console.log('✓ PostgreSQL connection established.\n');
    } catch (err) {
        console.error('✗ Cannot connect to PostgreSQL:', err.message);
        console.error('  Check DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env');
        process.exit(1);
    }

    // Open SQLite
    const sqliteDb = new sqlite3.Database(SQLITE_PATH, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error('✗ Cannot open SQLite file:', SQLITE_PATH);
            console.error('  ', err.message);
            process.exit(1);
        }
    });
    console.log(`✓ SQLite file opened: ${SQLITE_PATH}\n`);

    try {
        await pgClient.query('BEGIN');

        let totalMigrated = 0;

        for (const table of MIGRATION_ORDER) {
            try {
                const rows = await sqliteAll(sqliteDb, TABLE_SELECT_SQL[table]);
                let count = 0;
                for (const row of rows) {
                    const values = rowToValues(table, row);
                    await pgInsert(pgClient, TABLE_INSERT_SQL[table], values);
                    count++;
                }
                console.log(`  ✓ ${table.padEnd(20)} ${count} rows migrated`);
                totalMigrated += count;
            } catch (err) {
                // Table might not exist in SQLite (e.g., tenants/users on older setup)
                if (err.message && err.message.includes('no such table')) {
                    console.log(`  ⚠  ${table.padEnd(20)} table not found in SQLite, skipping.`);
                } else {
                    throw err;
                }
            }
        }

        await pgClient.query('COMMIT');
        console.log(`\n✓ All data committed. Total rows migrated: ${totalMigrated}`);

        // Reset PostgreSQL SERIAL sequences so new inserts get correct IDs
        console.log('\nResetting PostgreSQL sequences...');
        const sequenceTables = ['patients', 'sessions', 'qa_pairs', 'documents', 'summaries', 'templates'];
        for (const table of sequenceTables) {
            await resetSequence(pgClient, table);
            console.log(`  ✓ Sequence reset for: ${table}`);
        }

        console.log('\n╔══════════════════════════════════════════════════════╗');
        console.log('║           Migration Completed Successfully!          ║');
        console.log('╚══════════════════════════════════════════════════════╝\n');
        console.log('Next steps:');
        console.log('  1. Restart the server: node server/server.js');
        console.log('  2. Verify login and data in the application.');
        console.log('  3. Keep ai4care.db as a backup — it is not modified.\n');

    } catch (err) {
        await pgClient.query('ROLLBACK');
        console.error('\n✗ Migration failed — transaction rolled back.');
        console.error('  Error:', err.message);
        process.exit(1);
    } finally {
        pgClient.release();
        sqliteDb.close();
        await pgPool.end();
    }
}

migrate();
