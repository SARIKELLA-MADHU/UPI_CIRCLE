// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Assuming user model path

module.exports = async function(req, res, next) {
    // 1. Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', ''); // Look for "Bearer <token>"

    // 2. Check if no token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // 3. Verify token
    try {
        // Check if JWT_SECRET exists
         if (!process.env.JWT_SECRET) {
            console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
            return res.status(500).send('Server configuration error.');
         }

        // Verify the token using your secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Add user payload from token to request object
        // The payload should contain { user: { id: '...' } } based on how we created it
        if (!decoded.user || !decoded.user.id) {
             return res.status(401).json({ msg: 'Token is not valid (missing user payload)' });
        }
        req.user = decoded.user; // Attach user info (at least the id) to req

        // Optional: Check if user still exists in DB (more secure)
        // const userExists = await User.findById(req.user.id);
        // if (!userExists) {
        //    return res.status(401).json({ msg: 'User associated with token not found.' });
        // }

        next(); // Token is valid, proceed to the next middleware or route handler

    } catch (err) {
        // If token is not valid (e.g., expired, wrong secret)
        console.error('Token verification failed:', err.message);
        res.status(401).json({ msg: 'Token is not valid' });
    }
};