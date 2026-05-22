const database = require('./db/database');

async function runDiagnostic() {
    try {
        console.log("--- Production Diagnostic Start ---");
        
        // 1. Get the actual key being used for the specific tenant
        const targetTenantId = '8c47d82e-7c35-4bd8-8e9f-6c36b9928b07';
        const row = await database.get("SELECT value FROM settings WHERE key = 'gemini_api_key' AND tenant_id = ?", [targetTenantId]);
        const apiKey = row.value.trim();
        
        console.log(`Checking models for key ending in ...${apiKey.slice(-4)} (Tenant: ${targetTenantId})`);
        
        const check = async (version) => {
            const url = `https://generativelanguage.googleapis.com/${version}/models?key=${apiKey}`;
            const res = await fetch(url);
            const data = await res.json();
            console.log(`\n--- ${version} Results ---`);
            if (data.models) {
                console.log(data.models.map(m => m.name).join('\n'));
            } else {
                console.log(`Error ${res.status}: ${JSON.stringify(data)}`);
            }
        };
        
        await check('v1');
        await check('v1beta');

    } catch (err) {
        console.error("Diagnostic crashed:", err);
    } finally {
        process.exit();
    }
}

runDiagnostic();
