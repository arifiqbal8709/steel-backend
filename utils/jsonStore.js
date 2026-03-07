const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Basic JSON-based database helper
 */
class JsonStore {
    constructor(collection) {
        this.collection = collection;
        this.filePath = path.join(DATA_DIR, `${collection}.json`);
        // Initialize file if not exists
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, '[]', 'utf8');
        }
    }

    read() {
        try {
            const data = fs.readFileSync(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            console.error(`Error reading ${this.collection}:`, err);
            return [];
        }
    }

    write(data) {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (err) {
            console.error(`Error writing ${this.collection}:`, err);
            return false;
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    async find(query = {}) {
        let items = this.read();
        return items.filter(item => {
            return Object.entries(query).every(([key, value]) => item[key] === value);
        });
    }

    async findOne(query = {}) {
        const items = await this.find(query);
        return items[0] || null;
    }

    async findById(id) {
        const items = this.read();
        return items.find(item => item._id === id) || null;
    }

    async create(data) {
        console.log(`[JsonStore] Creating item in ${this.collection}`);
        const items = this.read();
        const newItem = {
            ...data,
            _id: data._id || this.generateId(),
            createdAt: data.createdAt || new Date().toISOString()
        };
        items.push(newItem);
        this.write(items);
        return newItem;
    }

    async updateOne(query, update) {
        const items = this.read();
        const index = items.findIndex(item => {
            return Object.entries(query).every(([key, value]) => item[key] === value);
        });

        if (index === -1) return null;

        items[index] = { ...items[index], ...update, updatedAt: new Date().toISOString() };
        this.write(items);
        return items[index];
    }

    async findByIdAndUpdate(id, update, options = {}) {
        const items = this.read();
        const index = items.findIndex(item => item._id === id);

        if (index === -1) return null;

        items[index] = { ...items[index], ...update, updatedAt: new Date().toISOString() };
        this.write(items);
        return items[index];
    }

    async findOneAndUpdate(query, update, options = {}) {
        return this.updateOne(query, update);
    }

    async deleteOne(query) {
        const items = this.read();
        const index = items.findIndex(item => {
            return Object.entries(query).every(([key, value]) => item[key] === value);
        });

        if (index === -1) return { deletedCount: 0 };

        const removed = items.splice(index, 1);
        this.write(items);
        return { deletedCount: 1, deletedItem: removed[0] };
    }

    async findOneAndDelete(query) {
        const items = this.read();
        const index = items.findIndex(item => {
            return Object.entries(query).every(([key, value]) => item[key] === value);
        });

        if (index === -1) return null;

        const removed = items.splice(index, 1);
        this.write(items);
        return removed[0];
    }

    async updateMany(query, update) {
        const items = this.read();
        let modifiedCount = 0;
        const updatedItems = items.map(item => {
            const match = Object.entries(query).every(([key, value]) => item[key] === value);
            if (match) {
                modifiedCount++;
                return { ...item, ...update, updatedAt: new Date().toISOString() };
            }
            return item;
        });
        this.write(updatedItems);
        return { modifiedCount };
    }
}

module.exports = JsonStore;
