const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const db = require('../db/database');

// --- Register New Clinic (SaaS Signup) ---
router.post('/register', async (req, res) => {
    console.log('POST /register hit');
    const { clinicName, email, password, fullName } = req.body;

    if (!clinicName || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const tenantId = crypto.randomUUID();
        const userId = crypto.randomUUID();
        const hashedPassword = await hashPassword(password);

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            // Create Tenant
            db.run('INSERT INTO tenants (id, name, status) VALUES (?, ?, ?)', 
                [tenantId, clinicName, 'active']);

            // Create Admin User
            db.run('INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, tenantId, email, hashedPassword, fullName, 'doctor'], function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        if (err.message.includes('UNIQUE constraint failed')) {
                            return res.status(400).json({ error: 'Email already exists' });
                        }
                        return res.status(500).json({ error: err.message });
                    }

                    // Seed Settings for the new tenant
                    const settingsStmt = db.prepare('INSERT INTO settings (key, value, tenant_id) VALUES (?, ?, ?)');
                    settingsStmt.run(['clinic_name', clinicName, tenantId]);
                    settingsStmt.run(['doctor_name', fullName, tenantId]);
                    settingsStmt.run(['clinic_email', email, tenantId]);
                    settingsStmt.run(['specialization', '', tenantId]);
                    settingsStmt.run(['clinic_phone', '', tenantId]);
                    settingsStmt.run(['clinic_address', '', tenantId]);
                    settingsStmt.run(['auto_save', 'true', tenantId]);
                    settingsStmt.run(['export_format', 'PDF', tenantId]);
                    settingsStmt.finalize();

                    db.run('COMMIT', (err) => {
                        if (err) return res.status(500).json({ error: err.message });
                        
                        const token = generateToken({ 
                            userId, 
                            tenantId, 
                            email, 
                            role: 'doctor' 
                        });

                        res.json({ 
                            message: 'Clinic registered successfully',
                            token,
                            user: { id: userId, email, fullName, role: 'doctor', tenantId, clinicName }
                        });
                    });
                }
            );
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to complete registration' });
    }
});

// --- Staff Management ---
const { authenticateToken } = require('../middleware/auth');

// Add new staff member
router.post('/staff', authenticateToken, async (req, res) => {
    // Only doctors or admins can add staff
    if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only doctors can manage staff' });
    }

    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const userId = crypto.randomUUID();
        const hashedPassword = await hashPassword(password);
        const tenantId = req.tenantId;

        db.run('INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, tenantId, email, hashedPassword, fullName, 'staff'], function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                res.json({ success: true, user: { id: userId, email, fullName, role: 'staff' } });
            });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all staff for clinic
router.get('/staff', authenticateToken, (req, res) => {
    db.all('SELECT id, email, full_name, role, created_at FROM users WHERE tenant_id = ? ORDER BY role DESC', [req.tenantId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Remove staff member
router.delete('/staff/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only doctors can manage staff' });
    }
    
    // Prevent deleting self
    if (req.params.id === req.userId) {
        return res.status(400).json({ error: 'You cannot remove yourself' });
    }

    db.run('DELETE FROM users WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- User Login ---
router.post('/login', async (req, res) => {
    const { email, password, tenantId } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        let query = 'SELECT u.*, t.name as clinic_name FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.email = ?';
        let params = [email];

        if (tenantId) {
            query += ' AND u.tenant_id = ?';
            params.push(tenantId);
        } else {
            // Admin login - find account with doctor/admin role
            query += " AND u.role IN ('doctor', 'admin') LIMIT 1";
        }

        db.get(query, params, async (err, user) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const errorMsg = tenantId 
                ? 'Invalid Clinic ID, email, or password' 
                : 'Invalid email or password';
                
            if (!user) return res.status(401).json({ error: errorMsg });

            try {
                const isMatch = await comparePassword(password, user.password_hash);
                if (!isMatch) return res.status(401).json({ error: errorMsg });

                const token = generateToken({ 
                    userId: user.id, 
                    tenantId: user.tenant_id, 
                    email: user.email, 
                    role: user.role 
                });

                res.json({
                    token,
                    user: { 
                        id: user.id, 
                        email: user.email, 
                        fullName: user.full_name, 
                        role: user.role, 
                        tenantId: user.tenant_id,
                        clinicName: user.clinic_name
                    }
                });
            } catch (innerError) {
                console.error('Password comparison error:', innerError);
                res.status(500).json({ error: 'Authentication failed' });
            }
        });
    } catch (error) {
        console.error('Login route error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

module.exports = router;
