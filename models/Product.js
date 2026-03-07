const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    sku: { type: String },
    category: { type: String, default: 'Finished Goods' },
    price: { type: Number, required: true }, // Sale Price
    purchasePrice: { type: Number, default: 0 },
    unit: { type: String, default: 'Units' },
    stock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    createdAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
});

module.exports = mongoose.model('Product', productSchema);
