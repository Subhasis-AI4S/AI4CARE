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
                for (const m of data.models) {
                    if (m.name.includes('embedding') || m.name.includes('aqa')) continue;
                    
                    // Probe each model for quota
                    const probeUrl = `https://generativelanguage.googleapis.com/${version}/${m.name}:generateContent?key=${apiKey}`;
                    const probeRes = await fetch(probeUrl, {
                        method: 'POST',
                        body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
                    });
                    const probeData = await probeRes.json();
                    
                    if (probeRes.ok) {
                        console.log(`[OK] ${m.name}`);
                    } else {
                        const msg = probeData.error ? probeData.error.message : 'Unknown error';
                        console.log(`[FAIL] ${m.name}: ${msg.substring(0, 50)}...`);
                    }
                }
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
