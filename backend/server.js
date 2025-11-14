const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path'); // IMPORTANT: Need to import the path module

// Load environment variables from .env file
dotenv.config();

const app = express();

// Middleware
app.use(express.json()); // Allows parsing of JSON request bodies
app.use(cors()); // Enables cross-origin requests

// -------------------
// MongoDB Connection
// -------------------
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected Successfully!');
    } catch (err) {
        console.error('MongoDB Connection Failed:', err.message);
        process.exit(1); // Exit process with failure
    }
};

connectDB();


// -------------------
// 1. Define & Use API Routes
// -------------------
// Import your router files
const authRoutes = require('./routes/authRoutes');
const feeRoutes = require('./routes/feeRoutes'); 

// Use the routers
app.use('/api/auth', authRoutes); // e.g., /api/auth/login
app.use('/api/fees', feeRoutes);   // e.g., /api/fees/assign, /api/fees/student


// -------------------
// 2. Serve Static Frontend Files (Must come before the final fallback)
// -------------------
// Serve static assets from the 'hackathon/frontend/public' directory
app.use(express.static(path.join(__dirname, '../frontend/public')));


// -------------------
// 3. Final Fallback Route
// -------------------
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/public', 'student.html'));
});


// -------------------
// Server Listening
// -------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
