const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductType' }, // Linking to a category/type like "Almira"
    name: { type: String, required: true },
    qty: { type: Number, default: 0 },
    unit: { type: String, default: 'PCS' },
    cost: { type: Number, required: true },
    category: { type: String },
    createdAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
});

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);
