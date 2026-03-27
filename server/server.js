const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db/database');
const path = require('path');
const multer = require('multer');
const { authenticateToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Authentication Routes
app.use('/api/auth', authRoutes);

// Patients API
app.get('/api/patients', authenticateToken, (req, res) => {
    db.all('SELECT * FROM patients WHERE tenant_id = ? ORDER BY created_at DESC', [req.tenantId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/patients', authenticateToken, (req, res) => {
    const { name, age, gender, contact } = req.body;
    db.run('INSERT INTO patients (name, age, gender, contact, tenant_id) VALUES (?, ?, ?, ?, ?)', [name, age, gender, contact, req.tenantId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, age, gender, contact, tenant_id: req.tenantId });
    });
});

// Sessions API
app.get('/api/sessions', authenticateToken, (req, res) => {
    const query = `
        SELECT s.*, p.name as patient_name, p.age as patient_age, sum.chief_complaint as summary_complaint
        FROM sessions s
        JOIN patients p ON s.patient_id = p.id
        LEFT JOIN summaries sum ON s.id = sum.session_id
        WHERE s.tenant_id = ?
        ORDER BY s.created_at DESC
    `;
    db.all(query, [req.tenantId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/sessions/:id', authenticateToken, (req, res) => {
    const sessionId = req.params.id;
    const data = {};

    db.get('SELECT s.*, p.name, p.age, p.gender FROM sessions s JOIN patients p ON s.patient_id = p.id WHERE s.id = ? AND s.tenant_id = ?', [sessionId, req.tenantId], (err, session) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!session) return res.status(404).json({ error: 'Session not found or unauthorized' });
        data.session = session;

        db.all('SELECT * FROM qa_pairs WHERE session_id = ? AND tenant_id = ? ORDER BY order_index ASC', [sessionId, req.tenantId], (err, qas) => {
            if (err) return res.status(500).json({ error: err.message });
            data.qa = qas;

            db.all('SELECT * FROM documents WHERE session_id = ? AND tenant_id = ?', [sessionId, req.tenantId], (err, docs) => {
                if (err) return res.status(500).json({ error: err.message });
                data.documents = docs;

                db.get('SELECT * FROM summaries WHERE session_id = ? AND tenant_id = ?', [sessionId, req.tenantId], (err, summary) => {
                    if (err) return res.status(500).json({ error: err.message });
                    data.summary = summary;
                    res.json(data);
                });
            });
        });
    });
});

app.post('/api/sessions', authenticateToken, (req, res) => {
    const { patient_id, complaint } = req.body;
    db.run('INSERT INTO sessions (patient_id, complaint, status, tenant_id) VALUES (?, ?, "in_progress", ?)', [patient_id, complaint, req.tenantId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, patient_id, complaint, status: 'in_progress', tenant_id: req.tenantId });
    });
});

app.put('/api/sessions/:id', authenticateToken, (req, res) => {
    const { complaint, status } = req.body;
    const { id } = req.params;
    
    let query = "UPDATE sessions SET ";
    const params = [];
    const sets = [];
    
    if (complaint !== undefined) {
        sets.push("complaint = ?");
        params.push(complaint);
    }
    
    if (status !== undefined) {
        sets.push("status = ?");
        params.push(status);
    }
    
    if (sets.length === 0) return res.status(400).json({ error: "No fields to update" });
    
    query += sets.join(", ") + ", updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?";
    params.push(id);
    params.push(req.tenantId);
    
    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Session not found or unauthorized' });
        res.json({ success: true, changes: this.changes });
    });
});

app.delete('/api/sessions/:id', authenticateToken, (req, res) => {
    const sessionId = req.params.id;
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Delete associated records first (ensure tenant isolation)
        db.run('DELETE FROM qa_pairs WHERE session_id = ? AND tenant_id = ?', [sessionId, req.tenantId]);
        db.run('DELETE FROM documents WHERE session_id = ? AND tenant_id = ?', [sessionId, req.tenantId]);
        db.run('DELETE FROM summaries WHERE session_id = ? AND tenant_id = ?', [sessionId, req.tenantId]);
        
        // Delete the session itself
        db.run('DELETE FROM sessions WHERE id = ? AND tenant_id = ?', [sessionId, req.tenantId], function(err) {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                db.run('ROLLBACK');
                return res.status(404).json({ error: 'Session not found or unauthorized' });
            }
            
            db.run('COMMIT', (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, message: "Session and all associated data deleted successfully" });
            });
        });
    });
});

app.put('/api/sessions/:id/status', authenticateToken, (req, res) => {
    const { status } = req.body;
    db.run('UPDATE sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?', [status, req.params.id, req.tenantId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Session not found or unauthorized' });
        res.json({ success: true });
    });
});

// QA Pairs API
app.post('/api/sessions/:id/qa', authenticateToken, (req, res) => {
    const sessionId = req.params.id;
    const { question, answer, order_index } = req.body;
    
    // First verify session ownership
    db.get('SELECT id FROM sessions WHERE id = ? AND tenant_id = ?', [sessionId, req.tenantId], (err, session) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!session) return res.status(403).json({ error: 'Unauthorized session access' });

        db.run('INSERT INTO qa_pairs (session_id, question, answer, order_index, tenant_id) VALUES (?, ?, ?, ?, ?)', [sessionId, question, answer, order_index, req.tenantId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, question, answer, tenant_id: req.tenantId });
        });
    });
});

// Summary API
app.post('/api/sessions/:id/summary', authenticateToken, (req, res) => {
    const sessionId = req.params.id;
    const { 
        chief_complaint, 
        history_of_presenting_illness, 
        key_findings, 
        clinical_flags, 
        assessment_notes,
        suggested_medications,
        suggested_tests
    } = req.body;
    
    // Check if summary already exists
    db.get('SELECT id FROM summaries WHERE session_id = ? AND tenant_id = ?', [sessionId, req.tenantId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (row) {
            // Update
            db.run(`UPDATE summaries SET 
                    chief_complaint = ?, history_of_presenting_illness = ?, key_findings = ?, clinical_flags = ?, assessment_notes = ?, suggested_medications = ?, suggested_tests = ?, edited_by_coordinator = 1, updated_at = CURRENT_TIMESTAMP 
                    WHERE session_id = ? AND tenant_id = ?`, 
                    [chief_complaint, history_of_presenting_illness, JSON.stringify(key_findings), JSON.stringify(clinical_flags), assessment_notes, suggested_medications, suggested_tests, sessionId, req.tenantId], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, updated: true });
            });
        } else {
            // Insert
            db.run('INSERT INTO summaries (session_id, chief_complaint, history_of_presenting_illness, key_findings, clinical_flags, assessment_notes, suggested_medications, suggested_tests, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                    [sessionId, chief_complaint, history_of_presenting_illness, JSON.stringify(key_findings), JSON.stringify(clinical_flags), assessment_notes, suggested_medications, suggested_tests, req.tenantId], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, id: this.lastID });
            });
        }
    });
});

// Templates API
app.get('/api/templates', authenticateToken, (req, res) => {
    db.all('SELECT * FROM templates WHERE tenant_id = ? OR tenant_id = "default-clinic-id"', [req.tenantId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/templates', authenticateToken, (req, res) => {
    const { name, trigger_keywords, questions } = req.body;
    db.run('INSERT INTO templates (name, trigger_keywords, questions, tenant_id) VALUES (?, ?, ?, ?)', [name, trigger_keywords, JSON.stringify(questions), req.tenantId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, trigger_keywords, tenant_id: req.tenantId });
    });
});

app.put('/api/templates/:id', authenticateToken, (req, res) => {
    const { name, trigger_keywords, questions } = req.body;
    db.run('UPDATE templates SET name = ?, trigger_keywords = ?, questions = ? WHERE id = ? AND tenant_id = ?', [name, trigger_keywords, JSON.stringify(questions), req.params.id, req.tenantId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Template not found or unauthorized' });
        res.json({ success: true });
    });
});

app.delete('/api/templates/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM templates WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Template not found or unauthorized' });
        res.json({ success: true });
    });
});

// Settings API
app.get('/api/settings', authenticateToken, (req, res) => {
    // Order by tenant_id DESC so that tenant-specific settings (which have longer IDs than 'default-clinic-id') 
    // or simply sorting them so that default-clinic-id comes first and gets overwritten by specific ones.
    db.all('SELECT * FROM settings WHERE tenant_id = ? OR tenant_id = "default-clinic-id" ORDER BY CASE WHEN tenant_id = "default-clinic-id" THEN 1 ELSE 2 END ASC', [req.tenantId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settingsMap = {};
        rows.forEach(r => settingsMap[r.key] = r.value);
        res.json(settingsMap);
    });
});

app.put('/api/settings', authenticateToken, (req, res) => {
    const updates = req.body; // { key1: val1, key2: val2 }
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare('INSERT INTO settings (key, value, tenant_id) VALUES (?, ?, ?) ON CONFLICT(key, tenant_id) DO UPDATE SET value=excluded.value');
        for (const [key, value] of Object.entries(updates)) {
            stmt.run([key, value, req.tenantId]);
        }
        stmt.finalize();

        // Sync with primary tables if relevant
        if (updates.clinic_name) {
            db.run('UPDATE tenants SET name = ? WHERE id = ?', [updates.clinic_name, req.tenantId]);
        }
        if (updates.doctor_name) {
            // Update the name for the current authenticated user (who is updating settings)
            db.run('UPDATE users SET full_name = ? WHERE id = ?', [updates.doctor_name, req.userId]);
        }

        db.run('COMMIT', (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// Document Upload API using Multer (Memory Storage for Database Storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/sessions/:id/documents', authenticateToken, upload.single('document'), (req, res) => {
    const sessionId = req.params.id;
    const { note } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileData = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    db.run('INSERT INTO documents (session_id, filename, file_path, coordinator_note, tenant_id, file_data, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [sessionId, req.file.originalname, req.file.originalname, note, req.tenantId, fileData, mimeType], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, filename: req.file.originalname, tenant_id: req.tenantId });
    });
});

// Document Download API (Retrieve from Database)
app.get('/api/documents/:id/download', authenticateToken, (req, res) => {
    db.get('SELECT * FROM documents WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId], (err, doc) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!doc || !doc.file_data) return res.status(404).json({ error: 'Document not found' });

        const fileBuffer = Buffer.from(doc.file_data, 'base64');
        res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`);
        res.send(fileBuffer);
    });
});

const gemini = require('./gemini');

// Gemini Routes
app.post('/api/gemini/questions', authenticateToken, async (req, res) => {
    try {
        const { complaint, language } = req.body;
        if (!complaint) return res.status(400).json({ error: 'Complaint is required' });
        
        const questions = await gemini.generateQuestions(complaint, language || 'en', req.tenantId);
        res.json({ questions });
    } catch (error) {
        console.error('Error generating questions:', error);
        res.status(500).json({ error: error.message || 'Failed to generate questions' });
    }
});

app.post('/api/gemini/summary', authenticateToken, async (req, res) => {
    try {
        const { sessionId, language } = req.body;
        if (!sessionId) return res.status(400).json({ error: 'Session ID is required' });

        // Retrieve data from DB (with tenant isolation)
        db.get('SELECT s.*, p.name, p.age, p.gender FROM sessions s JOIN patients p ON s.patient_id = p.id WHERE s.id = ? AND s.tenant_id = ?', [sessionId, req.tenantId], async (err, patientSession) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!patientSession) return res.status(404).json({ error: 'Session not found or unauthorized' });

            db.all('SELECT * FROM qa_pairs WHERE session_id = ? AND tenant_id = ? ORDER BY order_index ASC', [sessionId, req.tenantId], async (err, qas) => {
                if (err) return res.status(500).json({ error: err.message });

                db.all('SELECT * FROM documents WHERE session_id = ? AND tenant_id = ?', [sessionId, req.tenantId], async (err, docs) => {
                    if (err) return res.status(500).json({ error: err.message });

                    try {
                        const summary = await gemini.generateSummary(patientSession, patientSession.complaint, qas, docs, language || 'en', req.tenantId);
                        res.json({ summary });
                    } catch (genError) {
                        res.status(500).json({ error: genError.message || 'Failed to generate summary' });
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error generating summary:', error);
        res.status(500).json({ error: error.message || 'Failed to generate summary' });
    }
});

app.post('/api/gemini/document-note', authenticateToken, async (req, res) => {
    try {
        const { filename, note, language } = req.body;
        const generatedNote = await gemini.generateDocumentNote(filename, note, language || 'en', req.tenantId);
        res.json({ note: generatedNote });
    } catch (error) {
        console.error('Error generating document note:', error);
        res.status(500).json({ error: error.message || 'Failed to generate document note' });
    }
});


// Serve static files from the React app dist folder
app.use(express.static(path.join(__dirname, '../client/dist')));

// API 404 handler (must be after all other routes)
app.use('/api', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
