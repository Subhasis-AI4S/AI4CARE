const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function repairDatabase() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('--- Starting Database Repair ---');

        // 1. Fix NULL tenant_ids in all relevant tables
        // If they had NULL tenant, they belong to the very first default clinic.
        // Or if the user only has one main clinic they use, we can map to the first active tenant they have.
        
        // Find the user's primary tenant to assign old data to.
        const res = await client.query(`SELECT id, name FROM tenants ORDER BY created_at ASC`);
        console.log('Found Tenants:', res.rows.map(r => r.name).join(', '));
        
        // Usually, the first registered tenant that is NOT default is their main clinic, or they just want it in default.
        // Let's assign old clinical data (sessions, patients, etc) to 'default-clinic-id' if it's null, 
        // OR better yet, let's see which tenant they actually use.
        // Let's check how many NULL sessions there are:
        const nullSessions = await client.query(`SELECT COUNT(*) FROM sessions WHERE tenant_id IS NULL OR tenant_id = ''`);
        console.log(`Found ${nullSessions.rows[0].count} sessions with no tenant_id`);

        // Update all clinical data with NULL tenant_id to 'default-clinic-id'
        const tablesToUpdate = ['patients', 'sessions', 'documents', 'qa_pairs', 'summaries', 'templates'];
        for (const table of tablesToUpdate) {
            const updateRes = await client.query(`
                UPDATE ${table} 
                SET tenant_id = 'default-clinic-id' 
                WHERE tenant_id IS NULL OR tenant_id = ''
            `);
            console.log(`Fixed ${updateRes.rowCount} orphaned records in ${table}`);
        }

        // 2. Remove Duplicate Templates
        // If multiple templates have the SAME name and SAME tenant_id, keep only the most recent one.
        console.log('Removing duplicate templates...');
        const dupRes = await client.query(`
            DELETE FROM templates T1
            USING templates T2
            WHERE T1.id < T2.id 
              AND T1.name = T2.name 
              AND T1.tenant_id = T2.tenant_id
        `);
        console.log(`Deleted ${dupRes.rowCount} duplicate templates.`);

        await client.query('COMMIT');
        console.log('--- Repair Complete ---');
        process.exit(0);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Repair failed:', err);
        process.exit(1);
    } finally {
        client.release();
    }
}

repairDatabase();
