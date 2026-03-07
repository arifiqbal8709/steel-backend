const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const JsonStore = require('../utils/jsonStore');

const invoiceDB = new JsonStore('invoices');
const productDB = new JsonStore('products');
const customerDB = new JsonStore('customers');

// GET all active invoices
router.get('/', auth, async (req, res) => {
    try {
        const invoices = await invoiceDB.find({ userId: req.user.id, isDeleted: false });
        invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(invoices);
    } catch (err) {
        console.error("INVOICE FETCH ERROR:", err);
        res.status(500).json({ message: 'Error fetching invoices', error: err.message });
    }
});

// CREATE Invoice (with Stock Reduction)
router.post('/', auth, async (req, res) => {
    try {
        console.log("CREATE INVOICE REQUEST:", JSON.stringify(req.body, null, 2));
        const { invoiceNo, date, customerName, items, customerId } = req.body;

        if (!invoiceNo || !date || !customerName || !items || items.length === 0) {
            console.warn("MISSING REQUIRED FIELDS FOR INVOICE:", { invoiceNo, date, customerName, items: items?.length });
            return res.status(400).json({ message: 'Required fields missing: Invoice Number, Date, Customer, and Items are mandatory' });
        }

        const invoice = await invoiceDB.create({
            ...req.body,
            userId: req.user.id,
            isDeleted: false,
            createdAt: new Date().toISOString()
        });

        console.log("INVOICE SAVED, STARTING STOCK ADJUSTMENT...");

        // Stock Adjustment
        for (const item of items) {
            if (item.productName) {
                const products = await productDB.find({ userId: req.user.id, isDeleted: false });
                const product = products.find(p =>
                    (item.productId && p._id === item.productId) ||
                    (p.name && p.name === item.productName.toUpperCase())
                );

                if (product) {
                    console.log(`REDUCING STOCK FOR ${product.name}: ${product.stock} -> ${product.stock - (item.qty || 0)}`);
                    await productDB.findByIdAndUpdate(product._id, {
                        stock: Number(product.stock || 0) - Number(item.qty || 0)
                    });
                } else {
                    console.warn(`PRODUCT NOT FOUND FOR STOCK REDUCTION: ${item.productName}`);
                }
            }
        }

        // Update Customer Previous Due
        const bDue = Number(req.body.balanceDue) || Number(req.body.due) || (Number(req.body.grandTotal || 0) - Number(req.body.amountPaid || 0)) || 0;
        console.log(`UPDATING CUSTOMER DUE: ${customerId}, AMOUNT: ${bDue}`);

        if (customerId && bDue > 0) {
            const customer = await customerDB.findById(customerId);
            if (customer && customer.userId === req.user.id) {
                await customerDB.findByIdAndUpdate(customerId, {
                    previousDue: Number(customer.previousDue || 0) + bDue
                });
                console.log(`CUSTOMER ${customer.name} DUE UPDATED.`);
            }
        }

        console.log("INVOICE CREATION COMPLETE:", invoice._id);
        res.status(201).json(invoice);
    } catch (err) {
        console.error("INVOICE CREATION ERROR:", err);
        res.status(400).json({ message: 'Error creating invoice', error: err.message });
    }
});

// UPDATE invoice
router.put('/:id', auth, async (req, res) => {
    try {
        console.log("UPDATE INVOICE REQUEST:", req.params.id, JSON.stringify(req.body, null, 2));

        const invoice = await invoiceDB.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, isDeleted: false },
            req.body
        );

        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        // Note: We are currently overriding stock and due adjustments on edit to keep logic simple,
        // but real apps usually calculate diffs here.

        res.json(invoice);
    } catch (err) {
        console.error("INVOICE UPDATE ERROR:", err);
        res.status(400).json({ message: 'Error updating invoice', error: err.message });
    }
});

// SOFT DELETE invoice
router.delete('/:id', auth, async (req, res) => {
    try {
        const invoice = await invoiceDB.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, isDeleted: false },
            { isDeleted: true, deletedAt: new Date().toISOString() }
        );
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        res.json({ message: 'Invoice moved to trash' });
    } catch (err) {
        console.error("INVOICE DELETE ERROR:", err);
        res.status(500).json({ message: 'Error deleting invoice', error: err.message });
    }
});

// RESTORE invoice
router.patch('/:id/restore', auth, async (req, res) => {
    try {
        const invoice = await invoiceDB.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, isDeleted: true },
            { isDeleted: false, deletedAt: null }
        );
        if (!invoice) return res.status(404).json({ message: 'Invoice not found in trash' });
        res.json({ message: 'Invoice restored', invoice });
    } catch (err) {
        console.error("INVOICE RESTORE ERROR:", err);
        res.status(500).json({ message: 'Error restoring invoice', error: err.message });
    }
});

module.exports = router;
