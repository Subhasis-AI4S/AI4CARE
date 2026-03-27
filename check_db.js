const db = require('./server/db/database');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
        console.error('Error fetching tables:', err);
        process.exit(1);
    }
    console.log('Tables:', rows.map(r => r.name).join(', '));
    
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (err) console.error('Error checking users:', err.message);
        else console.log('Users count:', row.count);
        
        db.get("SELECT COUNT(*) as count FROM tenants", (err, row) => {
            if (err) console.error('Error checking tenants:', err.message);
            else console.log('Tenants count:', row.count);
            process.exit(0);
        });
    });
});
