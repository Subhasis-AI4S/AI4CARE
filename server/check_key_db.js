const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/ai4care.db');
db.all("SELECT * FROM settings WHERE key='gemini_api_key'", (err, rows) => {
    console.log("DB API Keys:", rows);
    db.close();
});
