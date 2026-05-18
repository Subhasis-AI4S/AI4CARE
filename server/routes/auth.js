const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const db = require('../db/database');

const cookieConfig = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
};

// --- Register New Clinic (SaaS Signup) ---
router.post('/register', async (req, res) => {
    console.log('POST /register hit');
    const { clinicName, email, password, fullName } = req.body;

    if (!clinicName || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!strongPasswordRegex.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)' });
    }

    try {
        const tenantId = crypto.randomUUID();
        const userId = crypto.randomUUID();
        const hashedPassword = await hashPassword(password);

        // Insert tenant
        await db.run('INSERT INTO tenants (id, name, status) VALUES (?, ?, ?)',
            [tenantId, clinicName, 'active']);

        // Insert admin user
        try {
            await db.run('INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, tenantId, email, hashedPassword, fullName, 'doctor']);
        } catch (err) {
            const isDuplicate = err.message && (
                err.message.includes('UNIQUE constraint failed') ||    // SQLite
                err.message.includes('duplicate key value')            // PostgreSQL
            );
            if (isDuplicate) return res.status(400).json({ error: 'Email already exists' });
            throw err;
        }

        // Seed default settings for new tenant
        const settings = [
            ['clinic_name', clinicName],
            ['doctor_name', fullName || ''],
            ['clinic_email', email],
            ['specialization', ''],
            ['clinic_phone', ''],
            ['clinic_address', ''],
            ['auto_save', 'true'],
            ['export_format', 'PDF']
        ];

        for (const [key, value] of settings) {
            if (db.isPg) {
                await db.run(
                    'INSERT INTO settings (key, value, tenant_id) VALUES (?, ?, ?) ON CONFLICT (key, tenant_id) DO NOTHING',
                    [key, value, tenantId]
                );
            } else {
                await db.run(
                    'INSERT OR IGNORE INTO settings (key, value, tenant_id) VALUES (?, ?, ?)',
                    [key, value, tenantId]
                );
            }
        }

        const token = generateToken({ userId, tenantId, email, role: 'doctor' });
        res.cookie('token', token, cookieConfig);
        res.json({
            message: 'Clinic registered successfully',
            user: { id: userId, email, fullName, role: 'doctor', tenantId, clinicName }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message || 'Failed to complete registration' });
    }
});

// --- Staff Management ---
const { authenticateToken } = require('../middleware/auth');

// Add new staff member
router.post('/staff', authenticateToken, async (req, res) => {
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

        await db.run(
            'INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, tenantId, email, hashedPassword, fullName, 'staff']
        );
        res.json({ success: true, user: { id: userId, email, fullName, role: 'staff' } });
    } catch (err) {
        const isDuplicate = err.message && (
            err.message.includes('UNIQUE constraint failed') ||
            err.message.includes('duplicate key value')
        );
        if (isDuplicate) return res.status(400).json({ error: 'Email already exists' });
        res.status(500).json({ error: err.message });
    }
});

// Get all staff for clinic
router.get('/staff', authenticateToken, async (req, res) => {
    try {
        const rows = await db.all(
            'SELECT id, email, full_name, role, created_at FROM users WHERE tenant_id = ? ORDER BY role DESC',
            [req.tenantId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Remove staff member
router.delete('/staff/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only doctors can manage staff' });
    }
    if (req.params.id === req.userId) {
        return res.status(400).json({ error: 'You cannot remove yourself' });
    }

    try {
        await db.run('DELETE FROM users WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin manual reset for staff password
router.post('/staff/:id/reset-password', authenticateToken, async (req, res) => {
    if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only doctors can reset staff passwords' });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    try {
        const hashedPassword = await hashPassword(newPassword);
        const result = await db.run(
            'UPDATE users SET password_hash = ? WHERE id = ? AND tenant_id = ?',
            [hashedPassword, req.params.id, req.tenantId]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found or unauthorized' });
        }
        
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- User Login ---
router.post('/login', async (req, res) => {
    const { email, password, tenantId } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        let query, params;

        if (tenantId) {
            // Staff login: specific clinic
            query = 'SELECT u.*, t.name as clinic_name FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.email = ? AND u.tenant_id = ?';
            params = [email, tenantId];
        } else {
            // Admin (doctor) login: find by email with doctor/admin role
            query = "SELECT u.*, t.name as clinic_name FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.email = ? AND u.role IN ('doctor', 'admin', 'superadmin') LIMIT 1";
            params = [email];
        }

        const user = await db.get(query, params);
        console.log('Login attempt for email:', email, '| user found:', !!user);

        const errorMsg = tenantId ? 'Invalid Clinic ID, email, or password' : 'Invalid email or password';
        if (!user) {
            console.log('Login failed: user not found');
            return res.status(401).json({ error: errorMsg });
        }

        const isMatch = await comparePassword(password, user.password_hash);
        console.log('Password match result:', isMatch);
        if (!isMatch) return res.status(401).json({ error: errorMsg });

        const token = generateToken({
            userId: user.id,
            tenantId: user.tenant_id,
            email: user.email,
            role: user.role
        });

        console.log('Setting cookie and sending JSON response...');
        res.cookie('token', token, cookieConfig);
        res.json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                tenantId: user.tenant_id,
                clinicName: user.clinic_name
            }
        });
        console.log('JSON response sent successfully.');

    } catch (error) {
        console.error('Login route error (CATCH BLOCK):', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// --- Check Auth (Session Persistence) ---
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.get(
            'SELECT u.*, t.name as clinic_name FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.id = ?',
            [req.userId]
        );
        if (!user) return res.status(401).json({ error: 'Session expired' });
        res.json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                tenantId: user.tenant_id,
                clinicName: user.clinic_name
            }
        });
    } catch (err) {
        res.status(401).json({ error: 'Session expired' });
    }
});

// --- Logout ---
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully' });
});

// --- Forgot Password ---
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            // Standard practice: do not leak whether the email exists
            return res.json({ message: 'If an account exists, a password reset link has been sent.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        // Token valid for 1 hour
        const expires = new Date(Date.now() + 3600000).toISOString();

        await db.run(
            'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE email = ?',
            [token, expires, email]
        );

        const resetLink = `http://localhost:3000/reset-password?token=${token}`;
        
        // Mocking nodemailer output for local development
        console.log(`\n======================================================`);
        console.log(`[MAILER MOCK] Password reset requested for ${email}`);
        console.log(`Click this link to reset password:`);
        console.log(`${resetLink}`);
        console.log(`======================================================\n`);

        res.json({ message: 'If an account exists, a password reset link has been sent.' });

    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Server error parsing reset request' });
    }
});

// --- Reset Password ---
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });

    try {
        const user = await db.get(
            // Check token and ensure it's not expired
            'SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expires > CURRENT_TIMESTAMP',
            [token]
        );

        if (!user) {
            return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
        }

        const hashedPassword = await hashPassword(newPassword);

        // Update password and clear the tokens
        await db.run(
            'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        res.json({ message: 'Password has been successfully updated. You can now login.' });

    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Server error processing password reset.' });
    }
});

module.exports = router;
