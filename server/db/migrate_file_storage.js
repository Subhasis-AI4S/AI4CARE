const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'ai4care.db'));

console.log('Starting database schema migration for file storage...');

db.serialize(() => {
    // Add file_data column to store Base64 encoded file content
    db.run(`ALTER TABLE documents ADD COLUMN file_data TEXT`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column file_data already exists, skipping.');
            } else {
                console.error('Error adding file_data:', err.message);
            }
        } else {
            console.log('Added column: file_data');
        }
    });

    // Add mime_type column to store the file's MIME type for proper serving
    db.run(`ALTER TABLE documents ADD COLUMN mime_type TEXT`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column mime_type already exists, skipping.');
            } else {
                console.error('Error adding mime_type:', err.message);
            }
        } else {
            console.log('Added column: mime_type');
        }
    });
});

setTimeout(() => {
    db.close();
    console.log('Migration complete!');
}, 1000);
