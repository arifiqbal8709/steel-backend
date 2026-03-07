const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const JsonStore = require('../utils/jsonStore');

const expenseDB = new JsonStore('expenses');

// GET all active expenses
router.get('/', auth, async (req, res) => {
    try {
        const expenses = await expenseDB.find({ userId: req.user.id, isDeleted: false });
        // Sort by date descending
        expenses.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
        res.json(expenses);
    } catch (err) {
        console.error("EXPENSE FETCH ERROR:", err);
        res.status(500).json({ message: 'Error fetching expenses', error: err.message });
    }
});

// CREATE expense
router.post('/', auth, async (req, res) => {
    try {
        console.log("CREATE EXPENSE REQUEST:", req.body);
        const { description, amount } = req.body;

        if (!description || isNaN(amount)) {
            return res.status(400).json({ message: 'Description and amount are required' });
        }

        const expense = await expenseDB.create({
            ...req.body,
            userId: req.user.id,
            amount: Number(amount),
            isDeleted: false,
            createdAt: new Date().toISOString()
        });
        console.log("EXPENSE CREATED:", expense._id);
        res.status(201).json(expense);
    } catch (err) {
        console.error("EXPENSE CREATE ERROR:", err);
        res.status(400).json({ message: 'Error creating expense', error: err.message });
    }
});

// UPDATE expense
router.put('/:id', auth, async (req, res) => {
    try {
        const expense = await expenseDB.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, isDeleted: false },
            {
                ...req.body,
                amount: Number(req.body.amount || 0)
            }
        );
        if (!expense) return res.status(404).json({ message: 'Expense not found' });
        res.json(expense);
    } catch (err) {
        console.error("EXPENSE UPDATE ERROR:", err);
        res.status(400).json({ message: 'Error updating expense', error: err.message });
    }
});

// SOFT DELETE expense
router.delete('/:id', auth, async (req, res) => {
    try {
        const expense = await expenseDB.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, isDeleted: false },
            { isDeleted: true, deletedAt: new Date().toISOString() }
        );
        if (!expense) return res.status(404).json({ message: 'Expense not found' });
        res.json({ message: 'Expense moved to trash (soft deleted)' });
    } catch (err) {
        console.error("EXPENSE DELETE ERROR:", err);
        res.status(500).json({ message: 'Error deleting expense', error: err.message });
    }
});

// RESTORE expense
router.patch('/:id/restore', auth, async (req, res) => {
    try {
        const expense = await expenseDB.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, isDeleted: true },
            { isDeleted: false, deletedAt: null }
        );
        if (!expense) return res.status(404).json({ message: 'Expense not found in trash' });
        res.json({ message: 'Expense restored', expense });
    } catch (err) {
        res.status(500).json({ message: 'Error restoring expense', error: err.message });
    }
});

module.exports = router;
