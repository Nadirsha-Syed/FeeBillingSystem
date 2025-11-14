const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const feeAssignmentSchema = new mongoose.Schema({
    // Links to the Student who owes the fee
    studentId: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true
    },
    // The specific fee details
    feeName: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: 'Pending',
        enum: ['Pending', 'Paid', 'Overdue'] // Use the specified color codes/statuses
    }
}, {
    timestamps: true
});

const FeeAssignment = mongoose.model('FeeAssignment', feeAssignmentSchema);
module.exports = FeeAssignment;