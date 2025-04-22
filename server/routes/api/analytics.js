// server/routes/api/analytics.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../../middleware/authMiddleware');
const Expense = require('../../models/Expense');
const Circle = require('../../models/Circle'); // Keep for potential use
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- Configure AI ---
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const aiModel = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" }) : null;

// --- Helper Functions ---
const getSixMonthsAgoDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date;
};

// CORRECTED Classify function with logging and .includes() logic
async function classifyExpense(expense) {
    // Log the input to the function
    console.log(`--- Classifying Expense ID: ${expense._id} ---`);
    console.log(`Input Data: Category='${expense.categoryId}', Amount=${expense.amount}, Desc='${expense.description}'`);

    if (!aiModel) {
        console.warn("AI Model not configured, skipping classification.");
        return 'Unclassified';
    }

    // Define the prompt (ensure variables are correctly interpolated)
    const prompt = `Analyze the following expense details and classify it strictly as either "Productive" or "Non-Productive".
Productive expenses generally contribute to essential needs, growth, or investment (e.g., rent, utilities, groceries, education, essential transport, health).
Non-Productive expenses are often discretionary or non-essential (e.g., entertainment, luxury shopping, non-essential dining out, non-essential travel).

Category: "${expense.categoryId}"
Description: "${expense.description}"
Amount: ${expense.amount}
Return ONLY the single word "Productive" or "Non-Productive":`; ;

    console.log(`Prepared Prompt for AI:\n---\n${prompt}\n---`);

    try {
        console.log(`Requesting classification from AI for expense: ${expense._id}...`);
        const result = await aiModel.generateContent(prompt);
        const response = await result.response;
        let rawText = response.text();
        let classification = 'Unclassified';

        console.log(`AI Raw Response for ${expense._id}: "${rawText}"`);

        if (rawText) {
            let cleanText = rawText.trim().toLowerCase();

            // Use .includes() for robust checking
            if (cleanText.includes('non-productive')) {
                 classification = 'Non-Productive';
            } else if (cleanText.includes('productive')) {
                 classification = 'Productive';
            } else {
                console.warn(`AI classification unclear response (doesn't include 'productive' or 'non-productive'): "${rawText}"`);
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


// --- ROUTE: GET /api/analytics/overview ---
// (ONLY this version, which reads pre-classified data)
router.get('/overview', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const sixMonthsAgo = getSixMonthsAgoDate();

    try {
        // 1. Fetch expenses WITH their saved classification
        const classifiedExpenses = await Expense.find({
            paidByUserId: userId,
            date: { $gte: sixMonthsAgo }
        }).populate('circleId', 'name').lean();

        if (!classifiedExpenses || classifiedExpenses.length === 0) {
             return res.json({
                 summary: { totalSpending: 0, productiveSpending: 0, nonProductiveSpending: 0 },
                 categorySpending: [],
                 monthlyBreakdown: []
             });
         }

        // 2. Aggregate Data
        let totalSpending = 0;
        let productiveSpending = 0;
        let nonProductiveSpending = 0;
        const categoryMap = new Map();
        const monthlyMap = new Map();

        classifiedExpenses.forEach(exp => {
            totalSpending += exp.amount;
            // Use the stored productivityType
            if (exp.productivityType === 'Productive') {
                productiveSpending += exp.amount;
            } else if (exp.productivityType === 'Non-Productive') {
                nonProductiveSpending += exp.amount;
            }
            // Sum by category
            const currentCatAmount = categoryMap.get(exp.categoryId) || 0;
            categoryMap.set(exp.categoryId, currentCatAmount + exp.amount);
            // Sum by month
            const monthKey = exp.date.toISOString().substring(0, 7);
            const currentMonthData = monthlyMap.get(monthKey) || { month: monthKey, productive: 0, nonProductive: 0 };
            if (exp.productivityType === 'Productive') {
                currentMonthData.productive += exp.amount;
            } else if (exp.productivityType === 'Non-Productive') {
                currentMonthData.nonProductive += exp.amount;
            }
             monthlyMap.set(monthKey, currentMonthData);
        });

        // 3. Format for response
        const categorySpending = Array.from(categoryMap.entries()).map(([category, amount]) => ({
            category, amount,
            percentage: totalSpending > 0 ? parseFloat(((amount / totalSpending) * 100).toFixed(1)) : 0
        })).sort((a, b) => b.amount - a.amount);

        const monthlyBreakdown = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

        res.json({
            summary: { totalSpending, productiveSpending, nonProductiveSpending },
            categorySpending,
            monthlyBreakdown
        });

    } catch (err) {
        console.error("Get Overview Error:", err.message);
        res.status(500).send('Server Error fetching overview data.');
    }
});


// --- Simple In-Memory Cache for Insights ---
const insightsCache = new Map();
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

// --- ROUTE: GET /api/analytics/insights (with Caching) ---
router.get('/insights', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    // 1. Check Cache
    const cachedEntry = insightsCache.get(userId);
    if (cachedEntry && (new Date() - cachedEntry.timestamp < CACHE_DURATION_MS)) {
        console.log(`Returning cached insights for user ${userId}`);
        return res.json({ insights: cachedEntry.insights });
    }

    // 2. If not in cache or expired, generate insights
    console.log(`Generating new insights for user ${userId}`);
    if (!aiModel) { return res.status(503).json({ msg: "AI Service not configured or available." }); }

    const sixMonthsAgo = getSixMonthsAgoDate();
    try {
        const expenses = await Expense.find({ paidByUserId: userId, date: { $gte: sixMonthsAgo } })
           .sort({ date: -1 }).limit(50).lean();

        if (!expenses || expenses.length === 0) {
            return res.json({ insights: ["No transaction data available for insights."] });
        }

        // Prepare prompt (Refine this!)
        const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const contextPrompt = `Based on the following recent transaction summaries... Total spent recently: ${totalSpent.toFixed(2)}. Recent transactions include items like: ${expenses.slice(0, 5).map(e => `${e.description} (${e.categoryId})`).join(', ')}.\n\nInsights (provide only the numbered list):\n1. ...\n2. ...\n3. ...`;

        // Call AI
        console.log("Requesting AI insights...");
        const result = await aiModel.generateContent(contextPrompt);
        const response = await result.response;
        let insightsText = response.text().trim();

        // Process insights
         const insights = insightsText.split('\n').map(line => line.replace(/^\d+\.\s*/, '').trim()).filter(line => line.length > 0 && line.length < 500);

        // 3. Store in cache
        insightsCache.set(userId, { insights: insights, timestamp: new Date() });
        console.log(`Cached new insights for user ${userId}`);
        res.json({ insights });

    } catch (err) {
        console.error("Get Insights Error:", err.message || err);
        if (err.status === 429 || (err.message && err.message.includes("429"))) {
             if (cachedEntry) {
                 console.warn("Rate limited, returning stale cache for user:", userId);
                 return res.json({ insights: cachedEntry.insights });
             }
             return res.status(429).json({ msg: "Rate limit exceeded generating insights. Please try again later." });
         }
        res.status(500).send('Server Error generating insights.');
    }
});


// --- Export Router ---
module.exports = router; // Ensure this is at the very end