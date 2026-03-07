const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No auth token, authorization denied' });
    }

    try {
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
        } catch (initialErr) {
            // Fallback for older tokens signed without env variable
            decoded = jwt.verify(token, 'default_secret');
        }
        req.user = decoded;
        next();
    } catch (err) {
        console.error("TOKEN VERIFICATION FAILED:", err.message);
        res.status(401).json({ message: 'Token is not valid', error: err.message });
    }
};
