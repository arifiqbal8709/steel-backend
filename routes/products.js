const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const JsonStore = require('../utils/jsonStore');

const productDB = new JsonStore('products');

// GET all active products
router.get('/', auth, async (req, res) => {
    try {
        const products = await productDB.find({ userId: req.user.id, isDeleted: false });
        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(products);
    } catch (err) {
        console.error("PRODUCTS FETCH ERROR:", err);
        res.status(500).json({ message: 'Error fetching products', error: err.message });
    }
});

// CREATE product
router.post('/', auth, async (req, res) => {
    try {
        console.log("CREATE PRODUCT REQUEST BODY:", JSON.stringify(req.body, null, 2));
        const { name, price, stock, quantity, sku, category, unit } = req.body;

        // Ensure mandatory fields are present
        const productPrice = price !== undefined && price !== "" ? Number(price) : NaN;
        const productStock = (stock !== undefined && stock !== "") ? Number(stock) : (quantity !== undefined && quantity !== "" ? Number(quantity) : NaN);

        if (!name || isNaN(productPrice) || isNaN(productStock)) {
            console.warn("VALIDATION FAILED FOR PRODUCT:", { name, price, stock, quantity });
            return res.status(400).json({
                message: 'Missing required fields: Product name, Price, and Quantity/Stock are mandatory'
            });
        }

        const product = await productDB.create({
            name: name.toUpperCase(),
            price: productPrice,
            stock: productStock,
            sku: sku || '',
            category: category || 'Finished Goods',
            unit: unit || 'Units',
            userId: req.user.id,
            isDeleted: false
        });

        console.log("PRODUCT CREATED:", product._id);
        res.status(201).json(product);
    } catch (err) {
        console.error("PRODUCT CREATE ERROR:", err);
        res.status(400).json({ message: 'Error creating product', error: err.message });
    }
});

// UPDATE product
router.put('/:id', auth, async (req, res) => {
    try {
        const product = await productDB.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, isDeleted: false },
            req.body
        );
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (err) {
        console.error("PRODUCT UPDATE ERROR:", err);
        res.status(400).json({ message: 'Error updating product', error: err.message });
    }
});

// SOFT DELETE product
router.delete('/:id', auth, async (req, res) => {
    try {
        const product = await productDB.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, isDeleted: false },
            { isDeleted: true, deletedAt: new Date().toISOString() }
        );
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json({ message: 'Product moved to trash (soft deleted)' });
    } catch (err) {
        console.error("PRODUCT DELETE ERROR:", err);
        res.status(500).json({ message: 'Error deleting product', error: err.message });
    }
});

// RESTORE product
router.patch('/:id/restore', auth, async (req, res) => {
    try {
        const product = await productDB.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, isDeleted: true },
            { isDeleted: false, deletedAt: null }
        );
        if (!product) return res.status(404).json({ message: 'Product not found in trash' });
        res.json({ message: 'Product restored', product });
    } catch (err) {
        console.error("PRODUCT RESTORE ERROR:", err);
        res.status(500).json({ message: 'Error restoring product', error: err.message });
    }
});

module.exports = router;
