const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

// Apply Super Admin protection to all routes in this file
router.use(authenticateToken, requireSuperAdmin);

/**
 * GET /api/superadmin/tenants
 * List all clinics with basic stats
 */
router.get('/tenants', async (req, res) => {
    try {
        const query = `
            SELECT 
                t.*, 
                (SELECT COUNT(*) FROM patients p WHERE p.tenant_id = t.id) as patient_count,
                (SELECT COUNT(*) FROM sessions s WHERE s.tenant_id = t.id) as session_count,
                (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as user_count
            FROM tenants t
            ORDER BY t.created_at DESC
        `;
        const tenants = await db.all(query);
        res.json(tenants);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PUT /api/superadmin/tenants/:id/status
 * Toggle clinic status (active/suspended)
 */
router.put('/tenants/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        await db.run('UPDATE tenants SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true, message: `Tenant status updated to ${status}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/superadmin/stats
 * Platform-wide aggregated stats
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await db.get(`
            SELECT 
                (SELECT COUNT(*) FROM tenants) as total_tenants,
                (SELECT COUNT(*) FROM patients) as total_patients,
                (SELECT COUNT(*) FROM sessions) as total_sessions,
                (SELECT COUNT(*) FROM users) as total_users
        `);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
