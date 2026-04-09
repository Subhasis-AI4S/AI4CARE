const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db/database');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const csrf = require('csurf');
const { authenticateToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const { addSummaryJob } = require('./utils/queue');
// Start the worker
if (process.env.NODE_ENV !== 'test') {
    require('./workers/aiWorker');
}
// Initialize environment
dotenv.config();

// Automated Database and Template Seeding Function
async function initializeDatabase() {
    console.log("--- Starting Automated Database Setup & Template Migrations ---");
    try {
        const setupDb = require('./db/setup');
        // If it's a function, call it; if it's the IIFE module (legacy), it runs on require
        if (typeof setupDb === 'function') {
            await setupDb();
        } else {
            // Legacy IIFE: just wait for it to complete
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        const setupSaas = require('./db/setup_saas');
        await setupSaas();

        const migrateTemplates = require('./db/migrate_templates');
        await migrateTemplates();

        const addDetailedTemplates = require('./db/add_detailed_respiratory_templates');
        await addDetailedTemplates();

        console.log("--- Automated Setup Complete ---");
    } catch (err) {
        console.error("Warning: Automated setup failed:", err.message);
    }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: true, // Allow all origins for dev, or specify frontend URL
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// CSRF Protection (Must be after cookieParser)
const csrfProtection = csrf({ cookie: true });
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Authentication Routes
app.use('/api/auth', csrfProtection, authRoutes);

// Apply CSRF protection to all other API routes
app.use('/api', csrfProtection);

// Patients API
app.get('/api/patients', authenticateToken, async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM patients WHERE tenant_id = ? ORDER BY created_at DESC', [req.tenantId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/patients', authenticateToken, async (req, res) => {
    const { name, age, gender, contact } = req.body;
    try {
        const result = await db.run('INSERT INTO patients (name, age, gender, contact, tenant_id) VALUES (?, ?, ?, ?, ?)', [name, age, gender, contact, req.tenantId]);
        res.json({ id: result.lastID, name, age, gender, contact, tenant_id: req.tenantId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Sessions API
app.get('/api/sessions', authenticateToken, async (req, res) => {
    const query = `
        SELECT s.*, p.name as patient_name, p.age as patient_age, sum.chief_complaint as summary_complaint
        FROM sessions s
        JOIN patients p ON s.patient_id = p.id
        LEFT JOIN summaries sum ON s.id = sum.session_id
        WHERE s.tenant_id = ?
        ORDER BY s.created_at DESC
    `;
    try {
        const rows = await db.all(query, [req.tenantId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sessions/:id', authenticateToken, async (req, res) => {
    const sessionId = req.params.id;
    const data = {};

    try {
        const session = await db.get('SELECT s.*, p.name, p.age, p.gender FROM sessions s JOIN patients p ON s.patient_id = p.id WHERE s.id = ? AND s.tenant_id = ?', [sessionId, req.tenantId]);
        if (!session) return res.status(404).json({ error: 'Session not found or unauthorized' });
        data.session = session;

        const [qas, docs, summary] = await Promise.all([
            db.all('SELECT * FROM qa_pairs WHERE session_id = ? AND tenant_id = ? ORDER BY order_index ASC', [sessionId, req.tenantId]),
            db.all('SELECT * FROM documents WHERE session_id = ? AND tenant_id = ?', [sessionId, req.tenantId]),
            db.get('SELECT * FROM summaries WHERE session_id = ? AND tenant_id = ?', [sessionId, req.tenantId])
        ]);

        data.qa = qas;
        data.documents = docs;
        data.summary = summary;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sessions', authenticateToken, async (req, res) => {
    const { patient_id, complaint } = req.body;
    try {
        const result = await db.run("INSERT INTO sessions (patient_id, complaint, status, tenant_id) VALUES (?, ?, 'in_progress', ?)", [patient_id, complaint, req.tenantId]);
        res.json({ id: result.lastID, patient_id, complaint, status: 'in_progress', tenant_id: req.tenantId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/sessions/:id', authenticateToken, async (req, res) => {
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

    try {
        const result = await db.run(query, params);
        if (result.changes === 0) return res.status(404).json({ error: 'Session not found or unauthorized' });
        res.json({ success: true, changes: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/sessions/:id', authenticateToken, async (req, res) => {
    const sessionId = req.params.id;

    try {
        await db.run('BEGIN TRANSACTION');

        // Delete associated records first (ensure tenant isolation)
        await db.run('DELETE FROM qa_pairs WHERE session_id = ? AND tenant_id = ?', [sessionId, req.tenantId]);
        await db.run('DELETE FROM documents WHERE session_id = ? AND tenant_id = ?', [sessionId, req.tenantId]);
        await db.run('DELETE FROM summaries WHERE session_id = ? AND tenant_id = ?', [sessionId, req.tenantId]);

        // Delete the session itself
        const result = await db.run('DELETE FROM sessions WHERE id = ? AND tenant_id = ?', [sessionId, req.tenantId]);

        if (result.changes === 0) {
            await db.run('ROLLBACK');
            return res.status(404).json({ error: 'Session not found or unauthorized' });
        }

        await db.run('COMMIT');
        res.json({ success: true, message: "Session and all associated data deleted successfully" });
    } catch (err) {
        try { await db.run('ROLLBACK'); } catch (e) { }
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/sessions/:id/status', authenticateToken, async (req, res) => {
    const { status } = req.body;
    try {
        const result = await db.run('UPDATE sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?', [status, req.params.id, req.tenantId]);
        if (result.changes === 0) return res.status(404).json({ error: 'Session not found or unauthorized' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// QA Pairs API
app.post('/api/sessions/:id/qa', authenticateToken, async (req, res) => {
    const sessionId = req.params.id;
    const { question, answer, order_index } = req.body;

    try {
        const session = await db.get('SELECT id FROM sessions WHERE id = ? AND tenant_id = ?', [sessionId, req.tenantId]);
        if (!session) return res.status(403).json({ error: 'Unauthorized session access' });

        const result = await db.run('INSERT INTO qa_pairs (session_id, question, answer, order_index, tenant_id) VALUES (?, ?, ?, ?, ?)', [sessionId, question, answer, order_index, req.tenantId]);
        res.json({ id: result.lastID, question, answer, tenant_id: req.tenantId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Summary API
app.post('/api/sessions/:id/summary', authenticateToken, async (req, res) => {
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

    try {
        const row = await db.get('SELECT id FROM summaries WHERE session_id = ? AND tenant_id = ?', [sessionId, req.tenantId]);

        if (row) {
            await db.run(`UPDATE summaries SET 
                    chief_complaint = ?, history_of_presenting_illness = ?, key_findings = ?, clinical_flags = ?, assessment_notes = ?, suggested_medications = ?, suggested_tests = ?, edited_by_coordinator = 1, updated_at = CURRENT_TIMESTAMP 
                    WHERE session_id = ? AND tenant_id = ?`,
                [chief_complaint, history_of_presenting_illness, JSON.stringify(key_findings), JSON.stringify(clinical_flags), assessment_notes, suggested_medications, suggested_tests, sessionId, req.tenantId]);
            res.json({ success: true, updated: true });
        } else {
            const result = await db.run('INSERT INTO summaries (session_id, chief_complaint, history_of_presenting_illness, key_findings, clinical_flags, assessment_notes, suggested_medications, suggested_tests, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [sessionId, chief_complaint, history_of_presenting_illness, JSON.stringify(key_findings), JSON.stringify(clinical_flags), assessment_notes, suggested_medications, suggested_tests, req.tenantId]);
            res.json({ success: true, id: result.lastID });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Templates API
app.get('/api/templates', authenticateToken, async (req, res) => {
    try {
        // Return all global templates (default-clinic-id) PLUS the tenant's own custom templates
        // We use DISTINCT ON (name) to deduplicate if the tenant has a custom template that overrides a global one.
        // We order by name, then by tenant_id descending (so the tenant's UUID comes before 'default-clinic-id' alphabetically usually,
        // or we simply order by case: tenant's ID first). Actually, just manually deduplicate in JS to be safe across DBs.
        
        const rows = await db.all(
            "SELECT * FROM templates WHERE tenant_id = 'default-clinic-id' OR tenant_id = ? ORDER BY name ASC",
            [req.tenantId]
        );
        
        const uniqueTemplates = new Map();
        for (const row of rows) {
            // If the map already has this template name, only overwrite it if the current row belongs to the tenant
            if (!uniqueTemplates.has(row.name) || row.tenant_id === req.tenantId) {
                uniqueTemplates.set(row.name, row);
            }
        }
        
        res.json(Array.from(uniqueTemplates.values()));
    } catch (err) {
        console.error('Templates API error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/templates', authenticateToken, async (req, res) => {
    const { name, trigger_keywords, questions } = req.body;
    try {
        const result = await db.run('INSERT INTO templates (name, trigger_keywords, questions, tenant_id) VALUES (?, ?, ?, ?)', [name, trigger_keywords, JSON.stringify(questions), req.tenantId]);
        res.json({ id: result.lastID, name, trigger_keywords, tenant_id: req.tenantId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/templates/:id', authenticateToken, async (req, res) => {
    const { name, trigger_keywords, questions } = req.body;
    try {
        const result = await db.run('UPDATE templates SET name = ?, trigger_keywords = ?, questions = ? WHERE id = ? AND tenant_id = ?', [name, trigger_keywords, JSON.stringify(questions), req.params.id, req.tenantId]);
        if (result.changes === 0) return res.status(404).json({ error: 'Template not found or unauthorized' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/templates/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.run('DELETE FROM templates WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
        if (result.changes === 0) return res.status(404).json({ error: 'Template not found or unauthorized' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Settings API
app.get('/api/settings', authenticateToken, async (req, res) => {
    try {
        const rows = await db.all("SELECT * FROM settings WHERE tenant_id = ? OR tenant_id = 'default-clinic-id' ORDER BY CASE WHEN tenant_id = 'default-clinic-id' THEN 1 ELSE 2 END ASC", [req.tenantId]);
        const settingsMap = {};
        rows.forEach(r => settingsMap[r.key] = r.value);
        res.json(settingsMap);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/settings', authenticateToken, async (req, res) => {
    const updates = req.body;
    try {
        await db.run('BEGIN TRANSACTION');

        for (const [key, value] of Object.entries(updates)) {
            if (db.isPg) {
                await db.run('INSERT INTO settings (key, value, tenant_id) VALUES (?, ?, ?) ON CONFLICT(key, tenant_id) DO UPDATE SET value=EXCLUDED.value', [key, value, req.tenantId]);
            } else {
                await db.run('INSERT INTO settings (key, value, tenant_id) VALUES (?, ?, ?) ON CONFLICT(key, tenant_id) DO UPDATE SET value=excluded.value', [key, value, req.tenantId]);
            }
        }

        if (updates.clinic_name) {
            await db.run('UPDATE tenants SET name = ? WHERE id = ?', [updates.clinic_name, req.tenantId]);
        }
        if (updates.doctor_name) {
            await db.run('UPDATE users SET full_name = ? WHERE id = ?', [updates.doctor_name, req.userId]);
        }

        await db.run('COMMIT');
        res.json({ success: true });
    } catch (err) {
        try { await db.run('ROLLBACK'); } catch (e) { }
        res.status(500).json({ error: err.message });
    }
});



// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Document Upload API using Multer (Disk Storage for Local Development)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.post('/api/sessions/:id/documents', authenticateToken, upload.single('document'), async (req, res) => {
    const sessionId = req.params.id;
    const { note } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const result = await db.run('INSERT INTO documents (session_id, filename, file_path, coordinator_note, tenant_id) VALUES (?, ?, ?, ?, ?)',
            [sessionId, req.file.originalname, req.file.filename, note, req.tenantId]);
        res.json({ id: result.lastID, filename: req.file.originalname, tenant_id: req.tenantId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Document Download API (Handle both Local File and Database Storage)
app.get('/api/documents/:id/download', authenticateToken, async (req, res) => {
    try {
        const doc = await db.get('SELECT * FROM documents WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
        if (!doc) return res.status(404).json({ error: 'Document not found' });

        if (doc.file_path && fs.existsSync(path.join(uploadsDir, doc.file_path))) {
            return res.sendFile(path.join(uploadsDir, doc.file_path));
        }

        res.status(404).json({ error: 'Document content not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

        // 1. Mark session as processing
        await db.run("UPDATE sessions SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?", [sessionId, req.tenantId]);

        // 2. Add job to queue
        await addSummaryJob(sessionId, req.tenantId, language || 'en');

        res.json({ success: true, message: 'AI summary generation started in background' });
    } catch (error) {
        console.error('Error initiating summary:', error);
        res.status(500).json({ error: error.message || 'Failed to initiate summary' });
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
app.use((req, res, next) => {
    // If it's an API request that wasn't handled, it will be caught by the 404 handler above.
    // Otherwise, serve the React app.
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Global Error Handler (Ensures API always returns JSON instead of HTML)
app.use((err, req, res, next) => {
    console.error('Global Error Handler caught:', err);
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ error: 'Invalid or missing CSRF token. Please refresh the page.' });
    }
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'test') {
    initializeDatabase().then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    });
} else {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
