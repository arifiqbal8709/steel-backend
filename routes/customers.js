const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const JsonStore = require('../utils/jsonStore');

const customerDB = new JsonStore('customers');

// GET all active customers
router.get('/', auth, async (req, res) => {
    try {
        const customers = await customerDB.find({ userId: req.user.id, isDeleted: false });
        // Sort by createdAt descending
        customers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(customers);
    } catch (err) {
        console.error("CUSTOMER FETCH ERROR:", err);
        res.status(500).json({ message: 'Error fetching customers', error: err.message });
    }
});

// CREATE customer
router.post('/', auth, async (req, res) => {
    try {
        console.log("CREATE CUSTOMER REQUEST:", req.body);
        const { name, contact, phone } = req.body;
        const customerPhone = contact || phone;

        if (!name || !customerPhone) {
            return res.status(400).json({ message: 'Customer name and contact number are required' });
        }

        const customer = await customerDB.create({
            ...req.body,
            phone: customerPhone, // normalize to phone
            userId: req.user.id,
            isDeleted: false,
            previousDue: Number(req.body.previousDue) || 0
        });
        console.log("CUSTOMER CREATED:", customer._id);
        res.status(201).json(customer);
    } catch (err) {
        console.error("CUSTOMER CREATE ERROR:", err);
        res.status(400).json({ message: 'Error creating customer', error: err.message });
    }
});

// UPDATE customer
router.put('/:id', auth, async (req, res) => {
    try {
        const customer = await customerDB.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, isDeleted: false },
            req.body
        );
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        res.json(customer);
    } catch (err) {
        console.error("CUSTOMER UPDATE ERROR:", err);
        res.status(400).json({ message: 'Error updating customer', error: err.message });
    }
});

// SOFT DELETE customer
router.delete('/:id', auth, async (req, res) => {
    try {
        const customer = await customerDB.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, isDeleted: false },
            { isDeleted: true, deletedAt: new Date().toISOString() }
        );
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        res.json({ message: 'Customer moved to trash (soft deleted)' });
    } catch (err) {
        console.error("CUSTOMER DELETE ERROR:", err);
        res.status(500).json({ message: 'Error deleting customer', error: err.message });
    }
});

// RESTORE customer
router.patch('/:id/restore', auth, async (req, res) => {
    try {
        const customer = await customerDB.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, isDeleted: true },
            { isDeleted: false, deletedAt: null }
        );
        if (!customer) return res.status(404).json({ message: 'Customer not found in trash' });
        res.json({ message: 'Customer restored', customer });
    } catch (err) {
        console.error("CUSTOMER RESTORE ERROR:", err);
        res.status(500).json({ message: 'Error restoring customer', error: err.message });
    }
});

module.exports = router;
