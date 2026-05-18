const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { AsyncLocalStorage } = require('async_hooks');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let db;
let prisma;
let isPg = false;
const dbStore = new AsyncLocalStorage();

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
    prisma = new PrismaClient({
        datasources: {
            db: {
                url: DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
            }
        }
    });

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
    dbStore, // Export for middleware to use

    // Helper to run code inside a session-local PG context
    runInContext: async (client, tenantId, role, callback) => {
        if (!isPg) return callback();
        await client.query(`SET LOCAL app.current_tenant_id = $1`, [tenantId]);
        await client.query(`SET LOCAL app.user_role = $2`, [role || 'staff']);
        return callback();
    },

    // Returns a single row
    get: async (sql, params = []) => {
        if (isPg) {
            const store = dbStore.getStore();
            const query = convertPlaceholders(sql);
            
            if (store && store.tenantId) {
                const client = await db.connect();
                try {
                    await client.query('BEGIN');
                    await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [store.tenantId]);
                    await client.query(`SELECT set_config('app.user_role', $1, true)`, [store.role || 'staff']);
                    const result = await client.query(query, params);
                    await client.query('COMMIT');
                    return result.rows[0];
                } catch (err) {
                    await client.query('ROLLBACK');
                    if (err.code === '22P02') return null;
                    throw err;
                } finally {
                    client.release();
                }
            } else {
                try {
                    const result = await db.query(query, params);
                    return result.rows[0];
                } catch (err) {
                    if (err.code === '22P02') return null;
                    throw err;
                }
            }
        }
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
        });
    },

    // Returns all rows
    all: async (sql, params = []) => {
        if (isPg) {
            const store = dbStore.getStore();
            const query = convertPlaceholders(sql);

            if (store && store.tenantId) {
                const client = await db.connect();
                try {
                    await client.query('BEGIN');
                    await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [store.tenantId]);
                    await client.query(`SELECT set_config('app.user_role', $1, true)`, [store.role || 'staff']);
                    const result = await client.query(query, params);
                    await client.query('COMMIT');
                    return result.rows;
                } catch (err) {
                    await client.query('ROLLBACK');
                    throw err;
                } finally {
                    client.release();
                }
            } else {
                const result = await db.query(query, params);
                return result.rows;
            }
        }
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
        });
    },

    // For INSERT / UPDATE / DELETE
    run: async (sql, params = []) => {
        if (isPg) {
            const store = dbStore.getStore();
            let pgSql = convertPlaceholders(sql);
            const isInsert = /^\s*INSERT/i.test(sql);
            const hasReturning = /RETURNING/i.test(sql);
            const tableMatch = sql.match(/INTO\s+(\w+)/i);
            const tableName = tableMatch ? tableMatch[1].toLowerCase() : '';
            const hasTextPk = TEXT_PK_TABLES.has(tableName);

            if (isInsert && !hasReturning && !hasTextPk) {
                pgSql += ' RETURNING id';
            }

            if (store && store.tenantId) {
                const client = await db.connect();
                try {
                    await client.query('BEGIN');
                    await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [store.tenantId]);
                    await client.query(`SELECT set_config('app.user_role', $1, true)`, [store.role || 'staff']);
                    const result = await client.query(pgSql, params);
                    await client.query('COMMIT');
                    return {
                        lastID: isInsert && !hasTextPk && result.rows[0] ? result.rows[0].id : null,
                        changes: result.rowCount,
                        rows: result.rows,
                    };
                } catch (err) {
                    await client.query('ROLLBACK');
                    throw err;
                } finally {
                    client.release();
                }
            } else {
                const result = await db.query(pgSql, params);
                return {
                    lastID: isInsert && !hasTextPk && result.rows[0] ? result.rows[0].id : null,
                    changes: result.rowCount,
                    rows: result.rows,
                };
            }
        }
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    },

    // Transaction Helper: handles BEGIN/COMMIT/ROLLBACK automatically
    transaction: async (callback) => {
        if (isPg) {
            const client = await db.connect();
            try {
                await client.query('BEGIN');
                const tx = {
                    run: async (sql, params = []) => {
                        let pgSql = convertPlaceholders(sql);
                        const isInsert = /^\s*INSERT/i.test(sql);
                        const tableMatch = sql.match(/INTO\s+(\w+)/i);
                        const tableName = tableMatch ? tableMatch[1].toLowerCase() : '';
                        const hasTextPk = TEXT_PK_TABLES.has(tableName);
                        if (isInsert && !hasTextPk && !/RETURNING/i.test(sql)) pgSql += ' RETURNING id';
                        const result = await client.query(pgSql, params);
                        return { lastID: isInsert && !hasTextPk && result.rows[0] ? result.rows[0].id : null, changes: result.rowCount };
                    },
                    get: async (sql, params = []) => {
                        const res = await client.query(convertPlaceholders(sql), params);
                        return res.rows[0];
                    },
                    all: async (sql, params = []) => {
                        const res = await client.query(convertPlaceholders(sql), params);
                        return res.rows;
                    }
                };
                const result = await callback(tx);
                await client.query('COMMIT');
                return result;
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        }
        return new Promise((resolve, reject) => {
            db.serialize(async () => {
                try {
                    db.run('BEGIN TRANSACTION');
                    const tx = {
                        run: (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function(err) { err ? rej(err) : res({ lastID: this.lastID, changes: this.changes }) })),
                        get: (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (err, row) => err ? rej(err) : res(row))),
                        all: (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (err, rows) => err ? rej(err) : res(rows)))
                    };
                    const result = await callback(tx);
                    db.run('COMMIT', (err) => err ? reject(err) : resolve(result));
                } catch (err) {
                    db.run('ROLLBACK', () => reject(err));
                }
            });
        });
    },

    // Exposes raw pg pool query for advanced use
    query: async (sql, params = []) => {
        if (isPg) return db.query(convertPlaceholders(sql), params);
        throw new Error('db.query() is only available in PostgreSQL mode');
    },

    // Expose prisma instance
    prisma,

    // Helper to get raw PG pool (for manual client usage)
    getPool: () => db
};

// If PG is active, extend Prisma to handle RLS context automatically via transaction wrapper
if (isPg && prisma) {
    database.prisma = prisma.$extends({
        query: {
            $allModels: {
                async $allOperations({ args, query }) {
                    const store = dbStore.getStore();
                    if (store && store.tenantId) {
                        return prisma.$transaction(async (tx) => {
                            await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${store.tenantId}, true)`;
                            await tx.$executeRaw`SELECT set_config('app.user_role', ${store.role || 'staff'}, true)`;
                            return query(args);
                        });
                    }
                    return query(args);
                },
            },
        },
    });
}

module.exports = database;
