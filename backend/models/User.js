const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
        enum: ['Admin', 'Student'] // Only allowed roles
    },
    // Fields specific to Students
    course: {
        type: String,
        required: function() { return this.role === 'Student'; }
    },
    year: {
        type: String,
        required: function() { return this.role === 'Student'; }
    }
}, {
    timestamps: true 
});

const User = mongoose.model('User', userSchema);
module.exports = User;