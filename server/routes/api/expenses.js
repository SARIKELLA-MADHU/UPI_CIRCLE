// server/routes/api/expenses.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Keep mongoose import
const authMiddleware = require('../../middleware/authMiddleware');
const Circle = require('../../models/Circle');
const Expense = require('../../models/Expense'); // Ensure Expense model is imported
const User = require('../../models/user'); // Keep if needed for population later

// --- AI Setup (Keep this at the top) ---
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const aiModel = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" }) : null;

// --- Helper: Classify Expense ---
// (Keep this function as provided before)
// Replace the entire classifyExpense function with this:
// Replace the entire classifyExpense function with this enhanced logging version:
// Inside server/routes/api/expenses.js

// Replace the entire classifyExpense function with this NEW version:
async function classifyExpense(expense) {
    // Log the input to the function
    console.log(`--- Classifying Expense ID: ${expense._id} ---`);
    console.log(`Input Data: Category='${expense.categoryId}', Amount=${expense.amount}, Desc='${expense.description}'`);

    if (!aiModel) {
        console.warn("AI Model not configured, skipping classification.");
        return 'Unclassified';
    }

    // --- NEW, MORE DETAILED PROMPT ---
    const productiveCategories = ['Rent & Utilities', 'Groceries', 'Education', 'Health & Medical', 'Transportation']; // Define productive categories
    const nonProductiveCategories = ['Shopping', 'Entertainment', 'Travel', 'Other', 'Food & Dining']; // Define non-productive categories (Treating Food & Dining as non-essential here, adjust if needed)

    const prompt = `Analyze the following expense details and classify it strictly as "Productive" or "Non-Productive".

Definitions:
- Productive: Essential needs, skill development, health, core transportation, investments. Categories typically include: ${productiveCategories.join(', ')}.
- Non-Productive: Discretionary spending, entertainment, non-essential items. Categories typically include: ${nonProductiveCategories.join(', ')}.

Expense Details:
Category: "${expense.categoryId}"
Description: "${expense.description}"
Amount: ${expense.amount}

Classification Instructions:
1. Prioritize the Category. If Category is in the Productive list (${productiveCategories.join(', ')}), lean towards "Productive".
2. If Category is in the Non-Productive list (${nonProductiveCategories.join(', ')}), lean towards "Non-Productive".
3. Use the Description to refine the classification ONLY if it strongly contradicts the category's typical use (e.g., 'Textbooks' under 'Shopping' could be Productive; 'Video Game' under 'Education' could be Non-Productive).
4. Consider the Amount if relevant (e.g., very high amount for 'Groceries' might warrant review, but generally rely on category/description).
5. Respond with ONLY the single word "Productive" or "Non-Productive".

Return only productive or non productive:`;
    // --- END OF NEW PROMPT ---


    console.log(`Prepared Prompt for AI:\n---\n${prompt}\n---`); // Log the exact prompt being sent

    try {
        console.log(`Requesting classification from AI for expense: ${expense._id}...`);
        const result = await aiModel.generateContent(prompt);
        const response = await result.response;
        let rawText = response.text();
        let classification = 'Unclassified';

        console.log(`AI Raw Response for ${expense._id}: "${rawText}"`);

        if (rawText) {
            let cleanText = rawText.trim().toLowerCase();

            // Use includes() for robust checking
            if (cleanText.includes('non-productive')) {
                 classification = 'Non-Productive';
            } else if (cleanText.includes('productive')) {
                 classification = 'Productive';
            } else {
                console.warn(`AI classification unclear response: "${rawText}"`);
            }
        } else {
             console.warn(`AI returned empty response for expense ${expense._id}`);
        }

        console.log(`==> Final classification decision for ${expense._id}: ${classification}`);
        return classification;

    } catch (error) {
        console.error(`AI classification CATCH BLOCK error for expense ${expense._id}:`, error.message || error);
        return 'Unclassified';
    }
}

// --- Keep the rest of the file (router definitions, module.exports) ---
// --- Keep the rest of the file (router.post, router.get, module.exports) ---
// --- as you provided it in the previous message. ---
// --- Route: Add New Expense (Modified for Classify-on-Save) ---
// @route   POST /api/expenses
// @desc    Add a new expense and trigger async AI classification
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    const payerUserId = req.user.id;
    const { description, amount, date, circleId, categoryId, receiverUpiId } = req.body;
    const expenseAmount = parseFloat(amount);

    // --- Input Validation ---
    if (!description || !amount || !date || !circleId || !categoryId) { /* ... */ }
    if (isNaN(expenseAmount) || expenseAmount <= 0) { /* ... */ }
    if (!mongoose.Types.ObjectId.isValid(circleId)) { /* ... */ }
    // --- End Validation ---

    try {
        // --- Find Circle and Verify Membership & Funds ---
        const circle = await Circle.findById(circleId);
        if (!circle) { return res.status(404).json({ msg: 'Circle not found.' }); }
        const memberIndex = circle.members.findIndex(m => m.userId.toString() === payerUserId);
        if (memberIndex === -1) { return res.status(403).json({ msg: 'You are not recorded as a member of this circle.' }); }
        const payerMemberData = circle.members[memberIndex];
        if (payerMemberData.allocatedBalance < expenseAmount) { return res.status(400).json({ msg: `Insufficient allocated balance...` }); }
        // --- End Verification ---

        // --- Perform Database Updates ---

        // 1. Deduct from allocatedBalance & save circle (Atomic within circle save)
        const newAllocatedBalance = Math.max(0, payerMemberData.allocatedBalance - expenseAmount);
        circle.members[memberIndex].allocatedBalance = newAllocatedBalance;
        const updatedCircle = await circle.save();
        if (!updatedCircle) { throw new Error("Failed to update circle balances."); }

        // 2. Create and Save the initial Expense document (productivityType defaults to 'Unclassified')
        const newExpense = new Expense({
            description, amount: expenseAmount, date: new Date(date), circleId,
            paidByUserId: payerUserId, categoryId, receiverUpiId: receiverUpiId || undefined
            // productivityType uses schema default 'Unclassified' here
        });
        const savedExpense = await newExpense.save(); // Save the basic expense info

        // 3. Send Response to Frontend IMMEDIATELY (don't wait for AI)
        console.log(`Expense ${savedExpense._id} recorded by ${payerUserId}. Triggering classification.`);
        res.status(201).json({ msg: 'Expense recorded successfully! Classification pending.', expense: savedExpense });

        // 4. Trigger AI Classification Asynchronously (fire and forget - don't await here)
        //    We use .then().catch() so it runs in the background without holding up the response.
        classifyExpense(savedExpense)
        .then(classification => { // 'classification' holds the result (e.g., 'Non-Productive')
            console.log(`Attempting DB update for ${savedExpense._id} with classification: '${classification}'`); // Log the value we intend to save
    
            // Update the expense document with the classification result
            // ADD { new: true } to return the UPDATED document
            return Expense.findByIdAndUpdate(
                savedExpense._id,
                { productivityType: classification },
                { new: true } // Ensures the updated document is returned
            );
        })
        .then(updatedDoc => {
            // Check if the update returned a document
            if (updatedDoc) {
                // Log the value ACTUALLY SAVED in the returned document
                console.log(`Expense ${updatedDoc._id} successfully updated. DB now has productivityType: '${updatedDoc.productivityType}'`);
            } else {
                // This might happen if the ID wasn't found, which shouldn't occur here
                console.error(`Expense ${savedExpense._id} update ran but findByIdAndUpdate returned null/undefined.`);
            }
        })
        .catch(err => {
            // Catch errors from classification OR the database update
            console.error(`Error during async classification/update for ${savedExpense._id}:`, err);
            });

        // --- End Updates ---

    } catch (err) {
        console.error("Add Expense Route Error:", err);
        // Avoid sending detailed errors potentially related to AI/DB update to client
        res.status(500).send('Server Error recording expense.');
    }
});


// --- Route: Get Recent Expenses ---
// (Keep this route as it was - it will read the potentially updated productivityType)
// server/routes/api/expenses.js

// --- Route: Get Recent Expenses ---
router.get('/recent', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const limit = 5;
    try {
        const recentExpenses = await Expense.find({ paidByUserId: userId })
            .sort({ date: -1 }) // Ensure this is -1
            .limit(limit)
            .populate('circleId', 'name')
            .populate('paidByUserId', 'name')
            .select('-__v');

        // --- CORRECTED LOGGING for /recent ---
        // Use the correct variable 'recentExpenses' and correct message
        console.log(`Backend check - /recent expenses order:`, recentExpenses.map(e => ({ date: e.date, asc: e.description })));
        // --- END OF CORRECTION ---

        res.json(recentExpenses); // Send response AFTER logging

    } catch (err) {
        console.error("Get Recent Expenses Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// --- Route: Get All Expenses ---
router.get('/all', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        const allExpenses = await Expense.find({ paidByUserId: userId }) // Using Option 1 filter
             .sort({ date: -1 }) // Ensure this is -1
             .populate('circleId', 'name')
             .populate('paidByUserId', 'name')
             .select('-__v');

        // --- ADDED LOGGING for /all ---
        console.log(`Backend check - /all expenses order:`, allExpenses.map(e => ({ date: e.date, asc: e.description })));
        // --- END OF ADDED LOG ---

        res.json(allExpenses); // Send response AFTER logging

    } catch (err) {
        console.error("Get All Expenses Error:", err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router; // Ensure this is at the end