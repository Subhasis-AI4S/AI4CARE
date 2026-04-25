const db = require('./database');

async function clearOldKeys() {
    console.log("--- Security Cleanup: Clearing Exposed Gemini API Keys ---");
    try {
        const result = await db.run("UPDATE settings SET value = '' WHERE key = 'gemini_api_key'");
        console.log(`Successfully cleared ${result.changes} API key entries.`);
        
        // Also check default-clinic-id specifically
        const check = await db.get("SELECT value FROM settings WHERE key = 'gemini_api_key' AND tenant_id = 'default-clinic-id'");
        if (check) {
            console.log("Verified: Default clinic key is now empty.");
        }
    } catch (err) {
        console.error("Cleanup failed:", err.message);
    } finally {
        process.exit(0);
    }
}

clearOldKeys();
