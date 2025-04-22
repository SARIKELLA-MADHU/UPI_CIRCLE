// server/models/Expense.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ExpenseSchema = new Schema({
    // ... other fields (description, amount, date, etc.) ...
    description: { /* ... */ },
    amount: { /* ... */ },
    date: { /* ... */ },
    circleId: { /* ... */ },
    paidByUserId: { /* ... */ },
    categoryId: { /* ... */ },
    receiverUpiId: { /* ... */ },

    // --- ADD THIS FIELD ---
    productivityType: {
        type: String,
        enum: ['Productive', 'Non-Productive', 'Unclassified'], // Possible values
        default: 'Unclassified' // Default value
    },
    // --- END OF ADD ---

    createdAt: { /* ... */ }
});

ExpenseSchema.index({ circleId: 1, date: -1 }); // Keep existing index

module.exports = mongoose.model('Expense', ExpenseSchema);