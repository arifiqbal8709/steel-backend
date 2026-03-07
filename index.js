const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: "https://arifshahinsteelfurn.netlify.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── JSON Data Initialization ──────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
console.log('✅ Local JSON Storage initialized in:', DATA_DIR);

// ─── Routes ───────────────────────────────────────────────────────────────────
// No 'checkMongo' middleware needed as JSON files are always accessible locally
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/raw-materials', require('./routes/rawMaterials'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/backup', require('./routes/backup'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        message: 'Vyapar Business API is online.',
        databaseStatus: 'LOCAL_JSON_STORAGE',
        mode: 'STABLE',
        env: process.env.NODE_ENV || 'development',
        apiBase: process.env.API_BASE_URL || `http://localhost:${PORT}`,
    });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[GLOBAL SERVER ERROR]', err);
    res.status(500).json({ success: false, message: 'Internal server error.', error: err.message });
});

// ─── Startup ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Server running at ${process.env.API_BASE_URL || `http://localhost:${PORT}`}`);
    console.log('✅ DATABASE: JSON File Storage Active (MongoDB Removed)');
});
