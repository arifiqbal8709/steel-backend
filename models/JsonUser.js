/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │  JSON FILE DATABASE — dev fallback when MongoDB is offline   │
 * │  Stores users as a JSON array in backend/data/users.json     │
 * │  Implements the same interface as the Mongoose User model    │
 * └─────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure the data directory and file exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf8');

function readUsers() {
    try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
    catch { return []; }
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Mimic Mongoose model interface ──────────────────────────────────────────

class JsonUser {
    constructor(data) {
        this._id = generateId();
        this.name = data.name;
        this.email = data.email || null;
        this.mobile = data.mobile || null;
        this.password = data.password;   // will be hashed on save()
        this.businessName = data.businessName || null;
        this.createdAt = new Date().toISOString();
    }

    // Validate: at least email or mobile
    async save() {
        if (!this.email && !this.mobile) {
            const err = new Error('Either email or mobile number is required');
            err.name = 'ValidationError';
            throw err;
        }

        // Hash password (only if plain-text — detect by lack of "$2b$")
        if (this.password && !this.password.startsWith('$2')) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }

        const users = readUsers();

        // Duplicate checks
        if (this.email && users.find(u => u.email && u.email === this.email)) {
            const err = new Error('email already registered');
            err.code = 11000;
            err.keyPattern = { email: 1 };
            throw err;
        }
        if (this.mobile && users.find(u => u.mobile && u.mobile === this.mobile)) {
            const err = new Error('mobile already registered');
            err.code = 11000;
            err.keyPattern = { mobile: 1 };
            throw err;
        }

        users.push({
            _id: this._id, name: this.name, email: this.email,
            mobile: this.mobile, password: this.password,
            businessName: this.businessName, createdAt: this.createdAt
        });
        writeUsers(users);
        return this;
    }

    async comparePassword(candidate) {
        return bcrypt.compare(candidate, this.password);
    }
}

// ── Static Mongoose-style methods ────────────────────────────────────────────
JsonUser.findOne = async function (query) {
    const users = readUsers();
    const [key, val] = Object.entries(query)[0];
    const found = users.find(u => u[key] === val);
    if (!found) return null;
    const u = new JsonUser(found);
    u._id = found._id;
    u.password = found.password; // keep hashed
    return u;
};

JsonUser.find = async function () {
    return readUsers();
};

JsonUser.deleteOne = async function (query) {
    const users = readUsers();
    const [key, val] = Object.entries(query)[0];
    const filtered = users.filter(u => u[key] !== val);
    writeUsers(filtered);
    return { deletedCount: users.length - filtered.length };
};

module.exports = JsonUser;
