const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const JsonStore = require('../utils/jsonStore');

const userDB = new JsonStore('users');

// HELPERS
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobileRegex = /^\d{10}$/;

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, mobile, password, businessName } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Full name is required.' });
        }

        if (!email && !mobile) {
            return res.status(400).json({ success: false, message: 'Please provide an email address or mobile number.' });
        }

        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required.' });
        }

        if (email && !emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format.' });
        }

        if (mobile && !mobileRegex.test(mobile)) {
            return res.status(400).json({ success: false, message: 'Mobile number must be 10 digits.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        }

        // Duplicate check
        const users = userDB.read();
        if (email && users.find(u => u.email === email.toLowerCase().trim())) {
            return res.status(400).json({ success: false, message: 'Email already exists.' });
        }
        if (mobile && users.find(u => u.mobile === mobile)) {
            return res.status(400).json({ success: false, message: 'Mobile number already registered.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await userDB.create({
            name: name.trim(),
            email: email ? email.toLowerCase().trim() : undefined,
            mobile: mobile || undefined,
            password: hashedPassword,
            businessName: businessName ? businessName.trim() : undefined,
        });

        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '7d' });

        return res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                mobile: newUser.mobile,
                businessName: newUser.businessName,
            }
        });

    } catch (err) {
        console.error('[REGISTER ERROR]', err);
        return res.status(500).json({ success: false, message: 'Registration failed.', error: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { identifier, password, rememberMe } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ success: false, message: 'Please provide credentials.' });
    }

    try {
        const isEmail = identifier.includes('@');
        const users = userDB.read();
        const user = users.find(u => isEmail
            ? u.email === identifier.toLowerCase().trim()
            : u.mobile === identifier.trim()
        );

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: rememberMe ? '30d' : '1d' }
        );

        return res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                businessName: user.businessName,
            }
        });

    } catch (err) {
        console.error('[LOGIN ERROR]', err);
        return res.status(500).json({ success: false, message: 'Login error.', error: err.message });
    }
});

// GET /api/auth/me
router.get('/me', require('../middleware/authMiddleware'), async (req, res) => {
    try {
        const user = await userDB.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                businessName: user.businessName,
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Auth verification failed.', error: err.message });
    }
});

module.exports = router;
