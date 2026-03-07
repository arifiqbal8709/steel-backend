const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/authMiddleware');
const JsonStore = require('../utils/jsonStore');

const userDB = new JsonStore('users');
const BACKUP_PATH = path.resolve(process.env.BACKUP_PATH || './backups');
const DATA_PATH = path.resolve(__dirname, '../data');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@shahin.com';

function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_PATH)) {
        fs.mkdirSync(BACKUP_PATH, { recursive: true });
    }
}

// Admin check using JSON store
async function requireAdmin(req, res, next) {
    try {
        const user = await userDB.findById(req.user.id);
        if (!user) return res.status(403).json({ success: false, message: 'User not found.' });

        const isAdmin = user.isAdmin === true || user.email === ADMIN_EMAIL;
        if (!isAdmin) {
            return res.status(403).json({ success: false, message: 'Admin privileges required.' });
        }
        next();
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Admin verification failed.', error: err.message });
    }
}

// POST /api/backup/trigger
router.post('/trigger', auth, requireAdmin, async (req, res) => {
    try {
        ensureBackupDir();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup_${timestamp}`;
        const backupDir = path.join(BACKUP_PATH, backupName);

        fs.mkdirSync(backupDir, { recursive: true });

        // Copy everything from data/ to backup/
        if (fs.existsSync(DATA_PATH)) {
            const files = fs.readdirSync(DATA_PATH);
            files.forEach(file => {
                const srcPath = path.join(DATA_PATH, file);
                const destPath = path.join(backupDir, file);
                if (fs.statSync(srcPath).isFile()) {
                    fs.copyFileSync(srcPath, destPath);
                }
            });
        }

        // Write metadata
        const meta = {
            name: backupName,
            createdAt: new Date().toISOString(),
            method: 'json-file-copy',
            triggeredBy: req.user.id
        };
        fs.writeFileSync(path.join(backupDir, '_meta.json'), JSON.stringify(meta, null, 2));

        res.json({ success: true, message: `Backup created: ${backupName}`, backup: meta });
    } catch (err) {
        console.error('[BACKUP ERROR]', err);
        res.status(500).json({ success: false, message: 'Backup failed.', error: err.message });
    }
});

// GET /api/backup/list
router.get('/list', auth, requireAdmin, (req, res) => {
    try {
        ensureBackupDir();
        const entries = fs.readdirSync(BACKUP_PATH, { withFileTypes: true });
        const backups = entries
            .filter(e => e.isDirectory())
            .map(e => {
                const metaPath = path.join(BACKUP_PATH, e.name, '_meta.json');
                let meta = { name: e.name };
                if (fs.existsSync(metaPath)) {
                    try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch { }
                }
                return meta;
            })
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        res.json({ success: true, backups });
    } catch (err) {
        res.status(500).json({ success: false, message: 'List failed.', error: err.message });
    }
});

// DELETE /api/backup/:name
router.delete('/:name', auth, requireAdmin, (req, res) => {
    try {
        const backupName = req.params.name;
        if (!/^[a-zA-Z0-9_\-]+$/.test(backupName)) {
            return res.status(400).json({ success: false, message: 'Invalid name.' });
        }
        const backupDir = path.join(BACKUP_PATH, backupName);
        if (fs.existsSync(backupDir)) {
            fs.rmSync(backupDir, { recursive: true, force: true });
        }
        res.json({ success: true, message: 'Backup deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Delete failed.', error: err.message });
    }
});

module.exports = router;
