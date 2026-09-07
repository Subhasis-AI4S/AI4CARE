/**
 * patient_history.js — AI4CARE Patient Past History & Home Medications API
 * 
 * Provides:
 *   - GET/POST/PUT/DELETE /api/patients/:id/past-history
 *   - GET/POST/PUT/DELETE /api/patients/:id/home-medications
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer for document uploads
const uploadsDir = path.join(__dirname, '../uploads/patient_docs');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = /pdf|jpg|jpeg|png|webp/;
        if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
        else cb(new Error('Only PDF and image files are allowed'));
    }
});

// ─────────────────────────────────────────────
// PATIENT PAST HISTORY
// ─────────────────────────────────────────────

// GET — All past history for a patient
router.get('/past-history', authenticateToken, async (req, res) => {
    try {
        const rows = await db.all(
            'SELECT * FROM patient_past_history WHERE patient_id = ? AND tenant_id = ? ORDER BY created_at DESC',
            [req.params.id, req.tenantId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST — Add a past history condition (with optional document upload)
router.post('/past-history', authenticateToken, upload.single('document'), async (req, res) => {
    const { condition_name, condition_category, diagnosis_year, status, notes } = req.body;
    if (!condition_name) return res.status(400).json({ error: 'Condition name is required' });

    const document_path = req.file ? req.file.filename : null;
    const document_name = req.file ? req.file.originalname : null;

    try {
        const result = await db.run(
            `INSERT INTO patient_past_history (patient_id, condition_name, condition_category, diagnosis_year, status, notes, document_path, document_name, tenant_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.params.id, condition_name, condition_category || 'respiratory', diagnosis_year || '', status || 'ongoing', notes || '', document_path, document_name, req.tenantId]
        );
        res.json({ id: result.lastID || result.id, condition_name, status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT — Update past history status (ongoing / cured / in_remission)
router.put('/past-history/:historyId', authenticateToken, async (req, res) => {
    const { status, notes, diagnosis_year, condition_category } = req.body;
    try {
        await db.run(
            `UPDATE patient_past_history SET status=?, notes=?, diagnosis_year=?, condition_category=?, updated_at=CURRENT_TIMESTAMP
             WHERE id=? AND patient_id=? AND tenant_id=?`,
            [status, notes, diagnosis_year, condition_category, req.params.historyId, req.params.id, req.tenantId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE — Remove a past history entry
router.delete('/past-history/:historyId', authenticateToken, async (req, res) => {
    try {
        await db.run(
            'DELETE FROM patient_past_history WHERE id=? AND patient_id=? AND tenant_id=?',
            [req.params.historyId, req.params.id, req.tenantId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
// PATIENT HOME MEDICATIONS (Continuation Tracking)
// ─────────────────────────────────────────────

// GET — All home medications for a patient
router.get('/home-medications', authenticateToken, async (req, res) => {
    try {
        const rows = await db.all(
            'SELECT * FROM patient_home_medications WHERE patient_id = ? AND tenant_id = ? ORDER BY created_at DESC',
            [req.params.id, req.tenantId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST — Add a home medication
router.post('/home-medications', authenticateToken, async (req, res) => {
    const { medication_name, dosage, frequency, route, prescribed_by, start_date, notes } = req.body;
    if (!medication_name) return res.status(400).json({ error: 'Medication name is required' });

    try {
        const result = await db.run(
            `INSERT INTO patient_home_medications (patient_id, medication_name, dosage, frequency, route, prescribed_by, start_date, continuation_status, notes, tenant_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'continuing', ?, ?)`,
            [req.params.id, medication_name, dosage || '', frequency || '', route || 'oral', prescribed_by || '', start_date || '', notes || '', req.tenantId]
        );
        res.json({ id: result.lastID || result.id, medication_name, continuation_status: 'continuing' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT — Update continuation status (continuing / stopped / adjusted)
router.put('/home-medications/:medId', authenticateToken, async (req, res) => {
    const { continuation_status, stop_date, stop_reason, dosage, frequency, notes } = req.body;
    try {
        await db.run(
            `UPDATE patient_home_medications SET continuation_status=?, stop_date=?, stop_reason=?, dosage=?, frequency=?, notes=?, updated_at=CURRENT_TIMESTAMP
             WHERE id=? AND patient_id=? AND tenant_id=?`,
            [continuation_status, stop_date || null, stop_reason || '', dosage, frequency, notes, req.params.medId, req.params.id, req.tenantId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE — Remove a home medication record
router.delete('/home-medications/:medId', authenticateToken, async (req, res) => {
    try {
        await db.run(
            'DELETE FROM patient_home_medications WHERE id=? AND patient_id=? AND tenant_id=?',
            [req.params.medId, req.params.id, req.tenantId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
