const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendorName: { type: String, required: true },
    date: { type: String, required: true },
    items: [{
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        unit: { type: String, default: 'PCS' },
        cost: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Purchase', purchaseSchema);
