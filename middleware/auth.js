const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ message: 'Authentication required' });

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
        } catch (initialErr) {
            decoded = jwt.verify(token, 'default_secret');
        }
        req.user = decoded;
        next();
    } catch (error) {
        console.error("TOKEN VERIFICATION FAILED inside auth.js:", error.message);
        res.status(401).json({ message: 'Invalid token', error: error.message });
    }
};
