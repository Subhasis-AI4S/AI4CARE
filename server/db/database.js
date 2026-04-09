const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let db;
let isPg = false;

// --- PostgreSQL Connection ---
// Activated when DB_HOST (or DATABASE_URL) is set in environment
const DATABASE_URL = process.env.DATABASE_URL;
const DB_HOST = process.env.DB_HOST;

// Tables that use TEXT primary keys — must NOT get RETURNING id appended
const TEXT_PK_TABLES = new Set(['tenants', 'users', 'settings']);

if (DATABASE_URL || DB_HOST) {
    console.log('Using PostgreSQL database.');
    isPg = true;

    const poolConfig = DATABASE_URL
        ? { connectionString: DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false }
        : {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        };

    db = new Pool(poolConfig);

    // Connection health check on startup
    db.connect((err, client, release) => {
        if (err) {
            console.error('PostgreSQL connection error:', err.message);
            console.error('Ensure PostgreSQL is running and credentials in .env are correct.');
        } else {
            console.log('PostgreSQL connected successfully.');
            release();
        }
    });

    // Pool error listener — prevents uncaught exceptions
    db.on('error', (err) => {
        console.error('Unexpected PostgreSQL pool error:', err.message);
    });

} else {
    console.log('Using SQLite database (DB_HOST not set).');
    const dbPath = path.resolve(__dirname, 'ai4care.db');
    db = new sqlite3.Database(dbPath);
    db.run('PRAGMA foreign_keys = ON');
}

// --- Placeholder conversion utility ---
// Converts SQLite's ? placeholders to PostgreSQL's $1, $2, ... style
function convertPlaceholders(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
}

// --- Unified Database Interface ---
const database = {
    isPg,

    // Returns a single row
    get: async (sql, params = []) => {
        if (isPg) {
            const result = await db.query(convertPlaceholders(sql), params);
            return result.rows[0];
        }
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
        });
    },

    // Returns all rows
    all: async (sql, params = []) => {
        if (isPg) {
            const result = await db.query(convertPlaceholders(sql), params);
            return result.rows;
        }
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
        });
    },

    // For INSERT / UPDATE / DELETE
    run: async (sql, params = []) => {
        if (isPg) {
            let pgSql = convertPlaceholders(sql);
            const isInsert = /^\s*INSERT/i.test(sql);
            const hasReturning = /RETURNING/i.test(sql);

            // Detect table name to decide if RETURNING id applies
            const tableMatch = sql.match(/INTO\s+(\w+)/i);
            const tableName = tableMatch ? tableMatch[1].toLowerCase() : '';
            const hasTextPk = TEXT_PK_TABLES.has(tableName);

            // Only append RETURNING id for tables with a SERIAL integer id column
            if (isInsert && !hasReturning && !hasTextPk) {
                pgSql += ' RETURNING id';
            }

            const result = await db.query(pgSql, params);
            return {
                lastID: isInsert && !hasTextPk && result.rows[0] ? result.rows[0].id : null,
                changes: result.rowCount,
                rows: result.rows,
            };
        }
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    },

    // Exposes raw pg pool query for advanced use (transactions, etc.)
    query: async (sql, params = []) => {
        if (isPg) {
            return db.query(convertPlaceholders(sql), params);
        }
        throw new Error('db.query() is only available in PostgreSQL mode');
    },

    // --- Transaction helpers (PostgreSQL + SQLite) ---
    beginTransaction: async () => {
        if (isPg) {
            const client = await db.connect();
            await client.query('BEGIN');
            return client;
        }
        return new Promise((resolve, reject) => {
            db.run('BEGIN TRANSACTION', (err) => err ? reject(err) : resolve(null));
        });
    },
};

module.exports = database;
