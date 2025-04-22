// server/routes/api/user.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware'); // Import auth middleware
const User = require('../../models/user'); // Import user model (ensure casing matches your file)

// @route   POST /api/user/addBalance
// @desc    Add simulated balance to logged-in user account
// @access  Private (Requires token)
router.post('/addBalance', authMiddleware, async (req, res) => {
    // Get amount from request body
    const { amount } = req.body;
    // Get user ID from req.user (which was attached by authMiddleware)
    const userId = req.user.id;

    // --- Input Validation ---
    // Convert amount to number and check if valid
    const amountToAdd = parseFloat(amount);
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
        return res.status(400).json({ msg: 'Please provide a valid positive amount.' });
    }
    // Optional: Add a maximum limit if desired
    // if (amountToAdd > 100000) { // Example limit
    //     return res.status(400).json({ msg: 'Amount exceeds maximum limit.' });
    // }
    // --- End Validation ---


    try {
        // Find the user and update their balance atomically using $inc
        // $inc is generally safer for incrementing numbers than fetching, adding, and saving
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { balance: amountToAdd } }, // Atomically increments the balance
            { new: true } // Option to return the *updated* document after the update
        ).select('balance name email'); // Select only the fields needed for the response

        // Check if the update was successful and user exists
        if (!updatedUser) {
             // This shouldn't normally happen if middleware passed, but good practice
             return res.status(404).json({ msg: 'User not found during balance update.' });
        }

        // Send success response with the new balance
        console.log(`Added ${amountToAdd} to balance for user ${updatedUser.email}. New balance: ${updatedUser.balance}`);
        res.json({
            msg: `Successfully added ₹${amountToAdd.toFixed(2)}.`,
            newBalance: updatedUser.balance // Send back the accurate new balance
        });

    } catch (err) {
        console.error("Add Balance Route Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;