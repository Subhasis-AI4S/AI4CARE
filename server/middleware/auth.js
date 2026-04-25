const { verifyToken } = require('../utils/auth');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    if (!token && req.cookies) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'Access denied. Please login.' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }

    // Attach user and tenant info to request object
    req.user = decoded;
    req.userId = decoded.userId;
    req.tenantId = decoded.tenantId;
    
    next();
};

const requireSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'superadmin') {
        return next();
    }
    res.status(403).json({ error: 'Super Admin access required.' });
};

module.exports = {
    authenticateToken,
    requireSuperAdmin
};
