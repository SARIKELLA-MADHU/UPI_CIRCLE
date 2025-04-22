// server/models/Circle.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CircleSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Circle name is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    host: { // The user who created the circle (admin)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', // Reference to the User model (using lowercase 'user' as per your setup)
        required: true
    },
    members: [ // Array of members in the circle
        {
            _id: false, // Don't create a separate _id for each member entry in the array
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'user', // Reference to the User model
                required: true
            },
            // Tracks how much this user has put into the pool (relevant for auto-split?)
            contribution: {
                type: Number,
                default: 0
            },
            // Tracks how much the host has specifically given this user (relevant for manual mode)
            allocatedBalance: {
                type: Number,
                default: 0
            }
        }
    ],
    // Optional unique ID for joining via link/code - can implement generation later
    // joinId: { type: String, unique: true, sparse: true },
    requiredAmount: { // The target amount for the circle (optional)
        type: Number,
        default: 0
    },
    poolBalance: { // The total simulated money currently in the circle's pool
        type: Number,
        default: 0,
        required: true
    },
    isAutoSplit: { // The toggle state (true=Auto-Split ON, false=Manual Allocation)
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create index for faster member lookup if needed later
// CircleSchema.index({ 'members.userId': 1 });

module.exports = mongoose.model('Circle', CircleSchema); // Model name 'Circle', collection 'circles'