// server/routes/api/auth.js
const express = require('express');
const router = express.Router();
const User = require('../../models/user'); // Path from api folder back to models
const authMiddleware = require('../../middleware/authMiddleware');
// Add these:
const otpGenerator = require('otp-generator');
const jwt = require('jsonwebtoken'); // Needed for /verify later, good to add now
// Ensure the utils folder and file exist or create them:
const { sendOtpEmail, sendOtpSms } = require('../../utils/otpSender');

// ... (rest of the file)

// @route   POST /api/auth/signup
// @desc    Register a new user
// server/routes/api/auth.js

// ... Keep the signup route above ...

// @route   POST /api/auth/login/initiate
// @desc    Find user by Name/UPI, generate & send OTP
// @access  Public
// PASTE THIS CODE BLOCK INTO YOUR auth.js FILE:

// @route   POST /api/auth/signup
// @desc    Register a new user
router.post('/signup', async (req, res) => {
    const { name, upiId, phoneNumber, email } = req.body;

    if (!name || !upiId || !phoneNumber || !email) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        // Use lowercase 'user' model name consistent with your require statement
        let user = await User.findOne({ $or: [{ upiId }, { phoneNumber }, { email }] });
        if (user) {
            let conflictField = 'credential';
            if(user.upiId === upiId) conflictField = 'UPI ID';
            else if(user.phoneNumber === phoneNumber) conflictField = 'Phone Number';
            else if(user.email === email) conflictField = 'Email';
            return res.status(400).json({ msg: `User already exists with this ${conflictField}` });
        }

        // Use lowercase 'user' model name
        user = new User({ name, upiId, phoneNumber, email });
        await user.save();

        res.status(201).json({
            msg: 'User registered successfully!',
            user: { id: user.id, name: user.name, email: user.email }
        });

    } catch (err) {
        console.error("Signup Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// --- End of code block to paste ---
router.post('/login/initiate', async (req, res) => {
    const { name, upiId } = req.body; // Using Name/UPI as requested

    if (!name || !upiId) {
        return res.status(400).json({ msg: 'Please provide Name and UPI ID' });
    }

    try {
        let user = await User.findOne({ name, upiId });
        if (!user) {
            // It's better to give a generic message for security
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Generate OTP
        const otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false, digits: true
        });
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

        // Save OTP and expiry to user document (Make sure otp/otpExpires fields are in User model)
        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        // Send OTP (Using email placeholder for now)
        const emailSent = await sendOtpEmail(user.email, otp);
        // const smsSent = await sendOtpSms(user.phoneNumber, otp); // If using SMS

        if (emailSent) { // Or smsSent
             res.json({ msg: 'OTP sent successfully.' }); // Adjust msg based on method
        } else {
            // Don't reveal too much internal detail in error messages
            console.error(`Failed OTP send attempt for user: ${user.email || user.phoneNumber}`);
            res.status(500).json({ msg: 'Failed to send OTP. Please try again later.'});
        }

    } catch (err) {
        console.error("Login Initiate Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// You will add the /login/verify route here next

// server/routes/api/auth.js
// ... imports ...
// ... signup route ...
// ... login/initiate route ...

// PASTE THIS CODE BLOCK: ------------
// @route   POST /api/auth/login/verify
// @desc    Verify OTP and login user (issue JWT)
// @access  Public
router.post('/login/verify', async (req, res) => {
    const { name, upiId, otp } = req.body; // Get Name, UPI, and OTP from request

    if (!name || !upiId || !otp) {
        return res.status(400).json({ msg: 'Please provide Name, UPI ID, and OTP' });
    }

    try {
        // Find user again by Name and UPI ID
        let user = await User.findOne({ name, upiId });
        if (!user) {
            // User potentially deleted between initiate and verify? Unlikely but possible.
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Check if OTP exists, matches, and has not expired
        if (user.otp !== otp || !user.otpExpires || user.otpExpires < Date.now()) {
            // Clear any invalid/expired OTP stored in DB
            user.otp = undefined;
            user.otpExpires = undefined;
            await user.save();
            return res.status(400).json({ msg: 'Invalid or expired OTP.' });
        }

        // --- OTP is VALID ---

        // Clear OTP fields from DB after successful verification
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // --- Login Success: Issue JWT ---
        const payload = {
            user: {
                id: user.id // Include user ID in the token payload
                // You can add other non-sensitive info like name or role if needed
            }
        };

        // Check if JWT_SECRET is set in environment variables
        if (!process.env.JWT_SECRET) {
             console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
             // In production, you might exit here: process.exit(1);
             return res.status(500).send('Server configuration error.');
        }

        // Sign the token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' }, // Token expiry time (e.g., 5 hours)
            (err, token) => {
                if (err) throw err; // Let global error handler catch JWT errors
                // Send the token back to the client upon successful login
                res.json({ token });
            }
        );

    } catch (err) {
        console.error("Login Verify Error:", err.message);
        res.status(500).send('Server Error');
    }
});
// server/routes/api/auth.js
// Make sure this route exists and is correct
router.get('/user', authMiddleware, async (req, res) => {
    try {
        // This will include the balance field by default
        const user = await User.findById(req.user.id).select('-otp -otpExpires -__v');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json(user); // Sends { _id, name, email, upiId, phoneNumber, balance, createdAt }
    } catch (err) {
        console.error("Get User Route Error:", err.message);
        res.status(500).send('Server Error');
    }
});
module.exports = router;