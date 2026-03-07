const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const JsonStore = require('../utils/jsonStore');

const staffDB = new JsonStore('staff');

// GET all active staff entries
router.get('/', auth, async (req, res) => {
    try {
        const entries = await staffDB.find({ userId: req.user.id, isDeleted: false });
        // Sort by date descending
        entries.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
        res.json(entries);
    } catch (err) {
        console.error("STAFF FETCH ERROR:", err);
        res.status(500).json({ message: 'Error fetching staff data', error: err.message });
    }
});

// CREATE entry
router.post('/', auth, async (req, res) => {
    try {
        console.log("CREATE STAFF ENTRY REQUEST:", req.body);
        const { labourName, totalValue, advancePaid } = req.body;

        if (!labourName) {
            return res.status(400).json({ message: 'Labour name is required' });
        }

        const entry = await staffDB.create({
            ...req.body,
            userId: req.user.id,
            isDeleted: false,
            balance: Number(totalValue || 0) - Number(advancePaid || 0)
        });
        console.log("STAFF ENTRY CREATED:", entry._id);
        res.status(201).json(entry);
    } catch (err) {
        console.error("STAFF_CREATE ERROR:", err);
        res.status(400).json({ message: 'Error creating staff entry', error: err.message });
    }
});

// UPDATE entry
router.put('/:id', auth, async (req, res) => {
    try {
        const entry = await staffDB.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, isDeleted: false },
            {
                ...req.body,
                balance: Number(req.body.totalValue || 0) - Number(req.body.advancePaid || 0)
            }
        );
        if (!entry) return res.status(404).json({ message: 'Entry not found' });
        res.json(entry);
    } catch (err) {
        console.error("STAFF_UPDATE ERROR:", err);
        res.status(400).json({ message: 'Error updating entry', error: err.message });
    }
});

// SOFT DELETE entry
router.delete('/:id', auth, async (req, res) => {
    try {
        const entry = await staffDB.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, isDeleted: false },
            { isDeleted: true, deletedAt: new Date().toISOString() }
        );
        if (!entry) return res.status(404).json({ message: 'Entry not found' });
        res.json({ message: 'Staff entry moved to trash (soft deleted)' });
    } catch (err) {
        console.error("STAFF DELETE ERROR:", err);
        res.status(500).json({ message: 'Error deleting entry', error: err.message });
    }
});

// RESTORE entry
router.patch('/:id/restore', auth, async (req, res) => {
    try {
        const entry = await staffDB.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, isDeleted: true },
            { isDeleted: false, deletedAt: null }
        );
        if (!entry) return res.status(404).json({ message: 'Entry not found in trash' });
        res.json({ message: 'Staff entry restored', entry });
    } catch (err) {
        res.status(500).json({ message: 'Error restoring entry', error: err.message });
    }
});

module.exports = router;
