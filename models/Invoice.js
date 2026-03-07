const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    invoiceNo: { type: String, required: true },
    date: { type: String, required: true },
    type: { type: String, enum: ['TAX', 'ESTIMATE'], default: 'TAX' },

    // Customer Info
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, required: true },
    customerAddress: { type: String },
    customerGSTIN: { type: String },
    customerStateCode: { type: String },

    // Shipping Info
    shippingName: { type: String },
    shippingAddress: { type: String },
    shippingGSTIN: { type: String },
    shippingStateCode: { type: String },

    placeOfSupply: { type: String },
    reverseCharge: { type: String, default: 'No' },

    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productName: { type: String, required: true },
        hsn: { type: String },
        qty: { type: Number, required: true },
        unit: { type: String, default: 'PCS' },
        rate: { type: Number, required: true },
        amount: { type: Number, required: true }
    }],

    total: { type: Number, required: true }, // Sub-total
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
});

module.exports = mongoose.model('Invoice', invoiceSchema);
