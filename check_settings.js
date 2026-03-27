const db = require('./server/db/database');

const email = 'aspirantsubhasis@gmail.com';

db.get('SELECT tenant_id FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user) {
        console.error('User not found');
        process.exit(1);
    }
    const tenantId = user.tenant_id;
    console.log('Tenant ID:', tenantId);
    
    db.all('SELECT * FROM settings WHERE tenant_id = ? OR tenant_id = "default-clinic-id"', [tenantId], (err, rows) => {
        if (err) {
            console.error('Error fetching settings:', err);
            process.exit(1);
        }
        console.log('Settings Rows:', rows);
        process.exit(0);
    });
});
