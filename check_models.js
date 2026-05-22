const sqlite3 = require('sqlite3');
const path = require('path');

async function checkModels() {
    try {
        const dbPath = path.join(__dirname, 'server', 'db', 'ai4care.db');
        const db = new sqlite3.Database(dbPath);
        
        const getApiKey = () => new Promise((resolve, reject) => {
            db.get("SELECT value FROM settings WHERE key = 'gemini_api_key' LIMIT 1", (err, row) => {
                if (err) reject(err); else resolve(row ? row.value.trim() : null);
            });
        });

        const apiKey = await getApiKey();
        if (!apiKey) {
            console.error("No API key found in database.");
            return;
        }

        console.log(`Checking models for key ending in ...${apiKey.slice(-4)}`);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const data = await response.json();
        
        console.log("--- Supported Models ---");
        if (data.models) {
            data.models.forEach(m => {
                console.log(`- ${m.name}`);
            });
        } else {
            console.log("No models returned. Response:", JSON.stringify(data));
        }
    } catch (err) {
        console.error("Diagnostic failed:", err.message);
    } finally {
        process.exit();
    }
}

checkModels();
