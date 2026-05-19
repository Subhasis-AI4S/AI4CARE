const db = require('./database');

async function cleanup() {
    console.log("[Cleanup] Purging all existing clinical templates to prepare for consolidation...");
    try {
        if (db.isPg) {
            await db.run('DELETE FROM templates');
        } else {
            await db.run('DELETE FROM templates');
        }
        console.log("[Cleanup] Templates table cleared successfully.");
    } catch (err) {
        console.error("[Cleanup] Failed to clear templates:", err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    cleanup();
}

module.exports = cleanup;
