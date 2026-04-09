const { Client } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const sqliteDbPath = path.resolve(__dirname, 'db', 'ai4care.db');
const pgUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ai4care';

async function migrate() {
    console.log('Starting migration to PostgreSQL...');

    const sqliteDb = new sqlite3.Database(sqliteDbPath);
    const pgClient = new Client({ connectionString: pgUrl });

    try {
        await pgClient.connect();
        console.log('Connected to PostgreSQL.');

        // 1. Create Tables
        await pgClient.query(`
            -- Tenants Table
            CREATE TABLE IF NOT EXISTS tenants (
                id UUID PRIMARY KEY,
                name TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                plan TEXT DEFAULT 'free',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Users Table
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT CHECK (role IN ('doctor', 'staff', 'admin')) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Patients Table
            CREATE TABLE IF NOT EXISTS patients (
                id SERIAL PRIMARY KEY,
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                age INTEGER,
                gender TEXT,
                contact TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Sessions Table
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
                complaint TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Summaries Table
            CREATE TABLE IF NOT EXISTS summaries (
                id SERIAL PRIMARY KEY,
                session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                chief_complaint TEXT,
                history_of_presenting_illness TEXT,
                key_findings TEXT, -- JSON string
                clinical_flags TEXT, -- JSON string
                assessment_notes TEXT,
                suggested_medications TEXT,
                suggested_tests TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Documents Table
            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL, -- Path on disk
                file_type TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Settings Table
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                UNIQUE(tenant_id, key)
            );

            -- Templates Table
            CREATE TABLE IF NOT EXISTS templates (
                id SERIAL PRIMARY KEY,
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                trigger_keywords TEXT,
                questions TEXT, -- JSON string
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Schema created.');

        // 2. Migrate Data
        const tables = ['tenants', 'users', 'patients', 'sessions', 'summaries', 'documents', 'settings', 'templates'];

        for (const table of tables) {
            console.log(`Migrating table: ${table}...`);
            const rows = await new Promise((resolve, reject) => {
                sqliteDb.all(`SELECT * FROM ${table}`, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            if (rows.length === 0) {
                console.log(`No data for ${table}.`);
                continue;
            }

            const columns = Object.keys(rows[0]);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            const insertQuery = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

            for (const row of rows) {
                const values = columns.map(col => row[col]);
                await pgClient.query(insertQuery, values);
            }
            console.log(`Migrated ${rows.length} rows to ${table}.`);
        }

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pgClient.end();
        sqliteDb.close();
    }
}

migrate();
