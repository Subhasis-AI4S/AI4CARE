/**
 * clinical_templates.js — AI4CARE Respiratory Clinical Module API
 * 
 * Provides:
 *   - GET/POST/PUT/DELETE /api/templates/medications
 *   - GET /api/templates/investigations
 *   - GET /api/templates/respiratory-questions
 *   - POST /api/templates/medications/auto-save (with duplicate detection)
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// ─────────────────────────────────────────────
// MEDICATION TEMPLATES
// ─────────────────────────────────────────────

// GET — Search / list all medications (fast binary-search-friendly sorted list)
router.get('/medications', authenticateToken, async (req, res) => {
    try {
        const { q, category } = req.query;
        let sql = 'SELECT * FROM medication_templates WHERE (tenant_id = ? OR tenant_id IS NULL OR tenant_id = ?)';
        const params = [req.tenantId, 'global'];

        if (q) {
            sql += ' AND (LOWER(name) LIKE ? OR LOWER(generic_name) LIKE ?)';
            params.push(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`);
        }
        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }
        sql += ' ORDER BY name ASC';
        const rows = await db.all(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST — Add a new medication template (admin/doctor)
router.post('/medications', authenticateToken, async (req, res) => {
    const { name, generic_name, category, dosage, route, frequency, default_duration, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Medication name is required' });

    try {
        const existing = await db.get(
            'SELECT id FROM medication_templates WHERE LOWER(name) = ? AND tenant_id = ?',
            [name.toLowerCase(), req.tenantId]
        );
        if (existing) return res.status(409).json({ error: 'Medication already exists', id: existing.id });

        const result = await db.run(
            `INSERT INTO medication_templates (name, generic_name, category, dosage, route, frequency, default_duration, notes, is_custom, tenant_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
            [name, generic_name || '', category || 'other', dosage || '', route || 'oral', frequency || '', default_duration || '', notes || '', req.tenantId]
        );
        res.json({ id: result.lastID || result.id, name, category, dosage, route, frequency });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST — Auto-save custom medication with duplicate detection + name normalization
router.post('/medications/auto-save', authenticateToken, async (req, res) => {
    const { name, dosage, route, frequency, default_duration } = req.body;
    if (!name) return res.status(400).json({ error: 'Medication name is required' });

    const normalizedName = name.trim().replace(/\b\w/g, c => c.toUpperCase());

    try {
        const existing = await db.get(
            'SELECT id, name FROM medication_templates WHERE LOWER(TRIM(name)) = ? AND (tenant_id = ? OR tenant_id = ?)',
            [normalizedName.toLowerCase(), req.tenantId, 'global']
        );

        if (existing) {
            return res.json({ id: existing.id, name: existing.name, status: 'already_exists' });
        }

        const result = await db.run(
            `INSERT INTO medication_templates (name, category, dosage, route, frequency, default_duration, is_custom, tenant_id)
             VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
            [normalizedName, 'custom', dosage || '', route || 'oral', frequency || '', default_duration || '', req.tenantId]
        );
        res.json({ id: result.lastID || result.id, name: normalizedName, status: 'created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT — Update a medication template
router.put('/medications/:id', authenticateToken, async (req, res) => {
    const { name, generic_name, category, dosage, route, frequency, default_duration, notes } = req.body;
    try {
        await db.run(
            `UPDATE medication_templates SET name=?, generic_name=?, category=?, dosage=?, route=?, frequency=?, default_duration=?, notes=?
             WHERE id=? AND tenant_id=?`,
            [name, generic_name, category, dosage, route, frequency, default_duration, notes, req.params.id, req.tenantId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE — Remove a medication template
router.delete('/medications/:id', authenticateToken, async (req, res) => {
    try {
        await db.run('DELETE FROM medication_templates WHERE id=? AND tenant_id=?', [req.params.id, req.tenantId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
// INVESTIGATION TEMPLATES
// ─────────────────────────────────────────────

// GET — Fetch all investigations grouped by category
router.get('/investigations', authenticateToken, async (req, res) => {
    try {
        const { q, category } = req.query;
        let sql = 'SELECT * FROM investigation_templates WHERE (tenant_id = ? OR tenant_id IS NULL OR tenant_id = ?)';
        const params = [req.tenantId, 'global'];

        if (q) {
            sql += ' AND LOWER(name) LIKE ?';
            params.push(`%${q.toLowerCase()}%`);
        }
        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }
        sql += ' ORDER BY category ASC, name ASC';
        const rows = await db.all(sql, params);

        const grouped = rows.reduce((acc, row) => {
            if (!acc[row.category]) acc[row.category] = [];
            acc[row.category].push(row);
            return acc;
        }, {});
        res.json({ grouped, flat: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST — Add new investigation template
router.post('/investigations', authenticateToken, async (req, res) => {
    const { name, category, sub_category, description, normal_range } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'Name and category are required' });
    try {
        const result = await db.run(
            `INSERT INTO investigation_templates (name, category, sub_category, description, normal_range, tenant_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, category, sub_category || '', description || '', normal_range || '', req.tenantId]
        );
        res.json({ id: result.lastID || result.id, name, category });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT — Update an investigation template
router.put('/investigations/:id', authenticateToken, async (req, res) => {
    const { name, category, sub_category, description, normal_range } = req.body;
    try {
        await db.run(
            `UPDATE investigation_templates SET name=?, category=?, sub_category=?, description=?, normal_range=?
             WHERE id=? AND tenant_id=?`,
            [name, category, sub_category || '', description || '', normal_range || '', req.params.id, req.tenantId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE — Remove an investigation template
router.delete('/investigations/:id', authenticateToken, async (req, res) => {
    try {
        await db.run('DELETE FROM investigation_templates WHERE id=? AND tenant_id=?', [req.params.id, req.tenantId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
// RESPIRATORY DISEASE SUGGESTIVE Q&A TEMPLATES
// ─────────────────────────────────────────────

// GET — Return ordered question tree with parsed options (supports ?disease= or ?category=)
router.get('/respiratory-questions', authenticateToken, async (req, res) => {
    try {
        const { disease, category } = req.query;
        let sql = 'SELECT * FROM respiratory_question_templates WHERE (tenant_id = ? OR tenant_id IS NULL OR tenant_id = ?) AND is_active = 1';
        const params = [req.tenantId, 'global'];

        const filterVal = disease || category;
        if (filterVal && filterVal !== 'all') {
            sql += ' AND (category = ? OR category = ?)';
            params.push(filterVal, 'general');
        }

        sql += ' ORDER BY order_index ASC';
        const rows = await db.all(sql, params);
        const questions = rows.map(row => ({
            ...row,
            options: row.options ? JSON.parse(row.options) : []
        }));
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST — Add a question template
router.post('/respiratory-questions', authenticateToken, async (req, res) => {
    const { question_text, category, input_type, options, order_index } = req.body;
    if (!question_text) return res.status(400).json({ error: 'Question text is required' });
    try {
        const result = await db.run(
            `INSERT INTO respiratory_question_templates (question_text, category, input_type, options, order_index, tenant_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [question_text, category || 'general', input_type || 'single_select', JSON.stringify(options || []), order_index || 0, req.tenantId]
        );
        res.json({ id: result.lastID || result.id, question_text, category });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT — Update a question template
router.put('/respiratory-questions/:id', authenticateToken, async (req, res) => {
    const { question_text, category, input_type, options, order_index } = req.body;
    try {
        await db.run(
            `UPDATE respiratory_question_templates SET question_text=?, category=?, input_type=?, options=?, order_index=?
             WHERE id=? AND tenant_id=?`,
            [question_text, category || 'general', input_type || 'single_select', JSON.stringify(options || []), order_index || 0, req.params.id, req.tenantId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE — Remove a question template
router.delete('/respiratory-questions/:id', authenticateToken, async (req, res) => {
    try {
        await db.run('DELETE FROM respiratory_question_templates WHERE id=? AND tenant_id=?', [req.params.id, req.tenantId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
