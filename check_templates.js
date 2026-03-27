const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'server', 'db', 'ai4care.db');
const db = new sqlite3.Database(dbPath);

db.all('SELECT * FROM templates', [], (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
