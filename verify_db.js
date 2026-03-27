const db = require('./server/db/database');

const verifyData = () => {
    db.all("SELECT * FROM patients WHERE tenant_id = 'demo-tenant-id'", (err, patients) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log("Found Patients:", patients.length);
        patients.forEach(p => console.log(`- ${p.name} (Age: ${p.age}, ID: ${p.id})`));

        db.all("SELECT * FROM sessions WHERE tenant_id = 'demo-tenant-id'", (err, sessions) => {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            console.log("Found Sessions:", sessions.length);
            sessions.forEach(s => console.log(`- Session ID: ${s.id}, Patient ID: ${s.patient_id}, Complaint: ${s.complaint}`));
            process.exit(0);
        });
    });
};

verifyData();
