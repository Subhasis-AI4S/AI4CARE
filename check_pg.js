const db = require('./server/db/database');

async function checkPg() {
    try {
        console.log('Is Postgres?', db.isPg);
        const users = await db.all('SELECT COUNT(*) as count FROM users');
        const tenants = await db.all('SELECT COUNT(*) as count FROM tenants');
        const sessions = await db.all('SELECT COUNT(*) as count FROM sessions');
        const templates = await db.all('SELECT COUNT(*) as count FROM templates');
        
        console.log('Users count:', users[0].count);
        console.log('Tenants count:', tenants[0].count);
        console.log('Sessions count:', sessions[0].count);
        console.log('Templates count:', templates[0].count);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkPg();
