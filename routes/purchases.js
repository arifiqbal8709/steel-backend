const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const JsonStore = require('../utils/jsonStore');

const purchaseDB = new JsonStore('purchases');
const productDB = new JsonStore('products');

// All routes protected by JWT auth
router.use(auth);

// GET /api/purchases
router.get('/', async (req, res) => {
    try {
        const purchases = await purchaseDB.find({ userId: req.user.id });
        purchases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(purchases || []);
    } catch (err) {
        console.error('[PURCHASE GET ERROR]', err);
        res.status(500).json({ message: 'Error fetching purchases', error: err.message });
    }
});

// POST /api/purchases
router.post('/', async (req, res) => {
    try {
        console.log("CREATE PURCHASE REQUEST:", req.body);
        const { vendorName, date, items, totalAmount, notes } = req.body;

        if (!vendorName || !items || !items.length) {
            return res.status(400).json({ message: 'Vendor name and items are required' });
        }

        const purchase = await purchaseDB.create({
            userId: req.user.id,
            vendorName,
            date,
            items,
            totalAmount: Number(totalAmount) || 0,
            notes,
            createdAt: new Date().toISOString()
        });

        console.log("PURCHASE SAVED, UPDATING INVENTORY...");

        // Update inventory stock for each purchased item
        for (const item of items) {
            const productName = (item.name || '').toUpperCase().trim();
            const products = await productDB.find({ userId: req.user.id, isDeleted: false });
            const product = products.find(p => p.name === productName);

            if (product) {
                // Increment existing stock
                await productDB.findByIdAndUpdate(product._id, {
                    stock: (Number(product.stock) || 0) + (Number(item.qty) || 0)
                });
            } else {
                // Auto-create product if it doesn't exist
                if (productName) {
                    await productDB.create({
                        userId: req.user.id,
                        name: productName,
                        stock: Number(item.qty) || 0,
                        price: Number(item.cost) || 0,
                        unit: item.unit || 'PCS',
                        category: 'Purchase Items',
                        isDeleted: false
                    });
                }
            }
        }

        console.log("PURCHASE CREATION COMPLETE:", purchase._id);
        res.status(201).json(purchase);
    } catch (err) {
        console.error('[PURCHASE POST ERROR]', err);
        res.status(500).json({ message: 'Error creating purchase record', error: err.message });
    }
});

// DELETE /api/purchases/:id
router.delete('/:id', async (req, res) => {
    try {
        const purchase = await purchaseDB.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!purchase) {
            return res.status(404).json({ message: 'Purchase record not found' });
        }

        res.json({ success: true, message: 'Purchase record deleted successfully' });
    } catch (err) {
        console.error('[PURCHASE DELETE ERROR]', err);
        res.status(500).json({ message: 'Error deleting purchase', error: err.message });
    }
});

module.exports = router;
