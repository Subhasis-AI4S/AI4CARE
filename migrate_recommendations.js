const db = require('./server/db/database');

const runSql = (sql) => {
    return new Promise((resolve, reject) => {
        db.run(sql, (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log(`Column already exists, skipping: ${sql.split('ADD COLUMN ')[1]}`);
                    resolve();
                } else {
                    reject(err);
                }
            } else {
                console.log(`Successfully executed: ${sql}`);
                resolve();
            }
        });
    });
};

const migrate = async () => {
    try {
        await runSql('ALTER TABLE summaries ADD COLUMN suggested_medications TEXT');
        await runSql('ALTER TABLE summaries ADD COLUMN suggested_tests TEXT');
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
