const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'ai4care.db');
const db = new sqlite3.Database(dbPath);

console.log('--- Database Check ---');

db.all("SELECT id, name FROM tenants", [], (err, tenants) => {
    if (err) {
        console.error('Error fetching tenants:', err);
        process.exit(1);
    }
    console.log('Tenants:', tenants);

    db.all("SELECT * FROM settings WHERE key = 'gemini_api_key'", [], (err, settings) => {
        if (err) {
            console.error('Error fetching settings:', err);
            process.exit(1);
        }
        console.log('Gemini API Key Settings:', settings.map(s => ({ ...s, value: s.value ? s.value.substring(0, 8) + '...' : 'EMPTY' })));
        db.close();
    });
});
