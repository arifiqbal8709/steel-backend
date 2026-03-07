const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken');

// Register (Mocked for Demo)
router.post("/register", (req, res) => {
    // In demo mode, we just return success
    const { name, email } = req.body;
    const token = jwt.sign({ id: 'demo_user_id', name, email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({
        message: "User Registered Successfully (DEMO MODE)",
        token,
        user: { id: 'demo_user_id', name, email }
    });
});

// Login (Hardcoded as requested)
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    // Hardcoded Demo User
    const DEMO_EMAIL = "admin@gmail.com";
    const DEMO_PASSWORD = "123456";

    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        const token = jwt.sign({ id: 'demo_user_id', name: "Admin User", email: DEMO_EMAIL }, process.env.JWT_SECRET, { expiresIn: '1d' });
        return res.json({
            message: "Login Success",
            token,
            user: { id: 'demo_user_id', name: "Admin User", email: DEMO_EMAIL }
        });
    } else {
        return res.status(401).json({ message: "Invalid credentials. Try admin@gmail.com / 123456" });
    }
});

module.exports = router;