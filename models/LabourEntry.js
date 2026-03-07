const mongoose = require('mongoose');

const labourEntrySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    workerName: { type: String, required: true },
    productName: { type: String, required: true },
    qty: { type: Number, required: true },
    rate: { type: Number, required: true },
    total: { type: Number, required: true },
    advancePaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    status: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
    createdAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
});

module.exports = mongoose.model('LabourEntry', labourEntrySchema);
