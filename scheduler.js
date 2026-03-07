/**
 * AUTOMATED BACKUP SCHEDULER
 *
 * Runs a MongoDB backup every day at midnight (00:00).
 * Uses mongodump when available, otherwise falls back to JSON export.
 *
 * Restore command (mongodump backups):
 *   mongorestore --uri="<MONGO_URI>" --dir="./backups/<backup_name>/<db_name>"
 *
 * Restore command (JSON fallback backups):
 *   Each collection is a separate .json file in ./backups/<backup_name>/
 *   Use mongoimport or the /api/backup/restore endpoint.
 */

const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

const BACKUP_PATH = path.resolve(process.env.BACKUP_PATH || './backups');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vyapar_db';

// ── Ensure backup directory exists ─────────────────────────────────────────────
function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_PATH)) {
        fs.mkdirSync(BACKUP_PATH, { recursive: true });
    }
}

// ── Run a single backup cycle ──────────────────────────────────────────────────
async function runScheduledBackup() {
    try {
        ensureBackupDir();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `auto_${timestamp}`;
        const backupDir = path.join(BACKUP_PATH, backupName);

        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        let method = 'mongodump';

        try {
            const dbName = MONGO_URI.split('/').pop().split('?')[0] || 'vyapar_db';
            const cmd = `mongodump --uri="${MONGO_URI}" --db="${dbName}" --out="${backupDir}"`;
            await execAsync(cmd, { timeout: 120000 });
        } catch (dumpErr) {
            console.warn('[SCHEDULER] mongodump failed, using JSON export:', dumpErr.message.split('\n')[0]);
            method = 'json-export';

            const mongoose = require('mongoose');
            const models = {
                users: require('./models/User'),
                customers: require('./models/Customer'),
                products: require('./models/Product'),
                invoices: require('./models/Invoice'),
                expenses: require('./models/Expense'),
                rawMaterials: require('./models/RawMaterial'),
            };

            fs.mkdirSync(backupDir, { recursive: true });

            for (const [name, Model] of Object.entries(models)) {
                try {
                    if (mongoose.connection.readyState !== 1) break;
                    const docs = await Model.find({}).lean();
                    fs.writeFileSync(
                        path.join(backupDir, `${name}.json`),
                        JSON.stringify(docs, null, 2),
                        'utf8'
                    );
                } catch (e) {
                    console.warn(`[SCHEDULER] Could not export ${name}:`, e.message);
                }
            }
        }

        // Write metadata
        const meta = {
            name: backupName,
            createdAt: new Date().toISOString(),
            method,
            triggeredBy: 'cron-scheduler',
        };
        fs.writeFileSync(path.join(backupDir, '_meta.json'), JSON.stringify(meta, null, 2));

        console.log(`✅ [SCHEDULER] Daily backup complete: ${backupName} (${method})`);

        // ── Auto-prune: keep only last 30 backups ─────────────────────────────
        pruneOldBackups(30);

    } catch (err) {
        console.error('[SCHEDULER] Backup failed:', err.message);
    }
}

// ── Keep only N most recent backups ────────────────────────────────────────────
function pruneOldBackups(keepCount = 30) {
    try {
        const entries = fs.readdirSync(BACKUP_PATH, { withFileTypes: true })
            .filter(e => e.isDirectory())
            .map(e => {
                const metaPath = path.join(BACKUP_PATH, e.name, '_meta.json');
                let createdAt = null;
                if (fs.existsSync(metaPath)) {
                    try { createdAt = JSON.parse(fs.readFileSync(metaPath, 'utf8')).createdAt; } catch { /* ignore */ }
                }
                return { name: e.name, createdAt: createdAt || e.name };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (entries.length > keepCount) {
            const toDelete = entries.slice(keepCount);
            toDelete.forEach(e => {
                try {
                    fs.rmSync(path.join(BACKUP_PATH, e.name), { recursive: true, force: true });
                    console.log(`[SCHEDULER] Pruned old backup: ${e.name}`);
                } catch { /* ignore */ }
            });
        }
    } catch (err) {
        console.warn('[SCHEDULER] Prune error:', err.message);
    }
}

// ── Start the cron scheduler ───────────────────────────────────────────────────
function startBackupScheduler() {
    // Run every day at midnight: '0 0 * * *'
    // For testing, you can change to '*/5 * * * *' (every 5 minutes)
    const CRON_SCHEDULE = process.env.BACKUP_CRON || '0 0 * * *';

    cron.schedule(CRON_SCHEDULE, () => {
        console.log(`⏰ [SCHEDULER] Triggering scheduled backup at ${new Date().toISOString()}`);
        runScheduledBackup();
    }, {
        timezone: 'Asia/Kolkata' // IST timezone
    });

    console.log(`⏰ [SCHEDULER] Daily backup scheduler started (${CRON_SCHEDULE}, IST)`);
    console.log(`   Backups will be saved to: ${BACKUP_PATH}`);
    console.log(`   To restore: mongorestore --uri="<URI>" --dir="./backups/<name>/<db>"`);
}

module.exports = { startBackupScheduler, runScheduledBackup, pruneOldBackups };
