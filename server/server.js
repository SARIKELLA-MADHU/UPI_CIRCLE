// server/server.js
require('dotenv').config(); // Needs to be at the top
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
 // <<<--- ADD THIS LINE

const app = express();
const PORT = process.env.PORT || 5001; // Use port from .env or default to 5001

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); 
app.use('/api/expenses', require('./routes/api/expenses'));
app.use('/api/analytics', require('./routes/api/analytics'));// Allow server to accept JSON in request body

// server/server.js
// ... (other requires, middleware like cors, express.json)

// --- Database Connection --- (Ensure this is present and uncommented)
mongoose.connect(process.env.MONGODB_URI, {/* options */})
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Basic Route (keep or modify)
app.get('/', (req, res) => {
  res.send('Hello from MERN Backend!');
});

// DEFINE ROUTES <<<< ADD THIS SECTION >>>>
// server/server.js
// ... other app.use lines ...
// server/server.js
// ... other requires and middleware ...

// --- API Routes ---
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/user', require('./routes/api/user'));
app.use('/api/circles', require('./routes/api/circles'));
app.use('/api/analytics', require('./routes/api/analytics')); // <<<--- ADD THIS LINE

// --- Serve Static Assets in Production --- (Keep this section if you have it)
// ...

// ... app.listen ...
// ... app.listen ...

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Start the server AFTER setting up DB connection attempt
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});