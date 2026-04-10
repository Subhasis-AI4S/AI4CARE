const db = require('./db/database');

async function checkTemplates() {
    console.log("--- Template Language Diagnostic ---");
    try {
        const rows = await db.all("SELECT name, trigger_keywords FROM templates WHERE trigger_keywords LIKE '%fever%' OR trigger_keywords LIKE '%ব্যথা%' LIMIT 20");
        console.log("Matched Samples:");
        console.table(rows);
        
        console.log("\nDistribution Analysis:");
        const allNames = await db.all("SELECT name FROM templates");
        const langCounts = {
            BN: allNames.filter(n => n.name.includes('BN') || n.name.includes('(BN)')).length,
            HI: allNames.filter(n => n.name.includes('HI') || n.name.includes('(HI)')).length,
            EN: allNames.filter(n => n.name.includes('EN') || n.name.includes('(EN)')).length,
            UNTOLD: allNames.filter(n => !n.name.includes('BN') && !n.name.includes('HI') && !n.name.includes('EN')).length
        };
        console.log(langCounts);

    } catch (err) {
        console.error("Diagnostic failed:", err);
    } finally {
        process.exit();
    }
}

checkTemplates();
