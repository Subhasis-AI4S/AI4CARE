const { verifyToken } = require('../utils/auth');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
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

module.exports = {
    authenticateToken
};
