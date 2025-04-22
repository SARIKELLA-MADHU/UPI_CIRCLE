// server/models/user.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: { type: String, required: true },
    upiId: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    otp: { type: String, default: undefined },
    otpExpires: { type: Date, default: undefined },

    // --- ADD THIS LINE ---
    balance: { type: Number, required: true, default: 0 },
    // --- END OF ADD ---

    createdAt: { type: Date, default: Date.now }
});

// Ensure you are using lowercase 'user' here if your filename is user.js
module.exports = mongoose.model('user', UserSchema);