const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, sparse: true, unique: true },
    mobile: { type: String, sparse: true, unique: true },
    password: { type: String, required: true },
    businessName: { type: String },
    address: { type: String },
    gstin: { type: String },
    isAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// At least one of email or mobile must be present
userSchema.pre('validate', function (next) {
    if (!this.email && !this.mobile) {
        return next(new Error('Either email or mobile number is required'));
    }
    next();
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
