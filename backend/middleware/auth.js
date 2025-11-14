const jwt = require('jsonwebtoken');

// Middleware to verify JWT token and attach user to request
const protect = (req, res, next) => {
    // 1. Get token from the standard Authorization header
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // Token is typically sent as "Bearer xyz.123.abc"
        token = req.headers.authorization.split(' ')[1];
    } else if (req.header('x-auth-token')) {
        // Fallback for older x-auth-token pattern
        token = req.header('x-auth-token');
    }

    // 2. Check if token exists
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // 3. Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Attach user info (id, role) to the request object
        req.user = decoded.user;
        next();

    } catch (err) {
        // This block runs if the token is invalid or the secret doesn't match
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Middleware to authorize based on role
const admin = (req, res, next) => {
    // req.user is set by the 'protect' middleware
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        res.status(403).json({ msg: 'Access denied: Admin role required' });
    }
};

module.exports = { protect, admin };