const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth'); 
const User = require('../models/User'); 
const FeeAssignment = require('../models/FeeAssignment'); 

// ----------------------------------------------------
// 1. POST /api/fees/assign: Admin assigns a fee to a student
// @access: Private (Admin Only)
// ----------------------------------------------------
router.post('/assign', protect, admin, async (req, res) => {
    const { studentId, feeName, amount, dueDate } = req.body;

    if (!studentId || !feeName || !amount || !dueDate) {
        return res.status(400).json({ msg: 'Please include studentId, feeName, amount, and dueDate.' });
    }

    try {
        // Verify that the target user is a Student
        const student = await User.findOne({ _id: studentId, role: 'Student' });
        if (!student) {
            return res.status(404).json({ msg: 'Student not found or ID is invalid.' });
        }
        
        // Create the Fee Assignment record
        const assignment = new FeeAssignment({
            studentId,
            feeName,
            amount,
            dueDate: new Date(dueDate), 
            status: 'Pending' // Initial status
        });

        await assignment.save();

        res.status(201).json({ 
            msg: `Fee assigned successfully to ${student.name}`, 
            assignment 
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error during fee assignment.');
    }
});

// ----------------------------------------------------
// 2. GET /api/fees/student: Get all fee assignments for the logged-in student
// @access: Private (Student Only)
// ----------------------------------------------------
router.get('/student', protect, async (req, res) => {
    if (req.user.role !== 'Student') {
        return res.status(403).json({ msg: 'Access denied. Student account required.' });
    }
    
    try {
        // Find all fee assignments linked to the student's ID 
        const studentFees = await FeeAssignment.find({ studentId: req.user.id }).sort({ dueDate: 1 });

        if (studentFees.length === 0) {
            // Return 200 with empty array if no fees are found
            return res.status(200).json({ msg: 'No fee assignments found for this student.', fees: [] });
        }

        res.json(studentFees);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error retrieving student fees.');
    }
});

// ----------------------------------------------------
// 3. PUT /api/fees/simulate/:id: Simulate payment for a specific fee assignment
// @access: Private (Student Only)
// ----------------------------------------------------
router.put('/simulate/:id', protect, async (req, res) => {
    const assignmentId = req.params.id;

    if (req.user.role !== 'Student') {
        return res.status(403).json({ msg: 'Access denied. Student account required.' });
    }

    try {
        let assignment = await FeeAssignment.findById(assignmentId);

        if (!assignment) {
            return res.status(404).json({ msg: 'Fee assignment not found.' });
        }

        // Security Check & Status Check
        if (assignment.studentId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized to pay this fee.' });
        }
        if (assignment.status === 'Paid') {
            return res.status(400).json({ msg: 'This fee is already paid.' });
        }

        // Update status and add simulated transaction details
        assignment.status = 'Paid';
        assignment.transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        assignment.paymentMode = 'Online (Simulated)'; 
        
        await assignment.save();

        res.json({ 
            msg: 'Payment simulated successfully. Status updated to Paid.',
            receipt: assignment 
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error during simulated payment.');
    }
});


// ----------------------------------------------------
// 4. GET /api/fees/reports/summary: Admin gets fee collection summary for charts
// @access  Private (Admin Only)
// ----------------------------------------------------
router.get('/reports/summary', protect, admin, async (req, res) => {
    // Full URL: /api/fees/reports/summary
    try {
        // Use MongoDB aggregation to group by status and sum the amounts
        const summary = await FeeAssignment.aggregate([
            {
                $group: {
                    _id: "$status", // Group by Paid, Pending, Overdue
                    totalAmount: { $sum: "$amount" }
                }
            }
        ]);

        // Format the data for the frontend/Chart.js
        const totalPending = summary.find(s => s._id === 'Pending')?.totalAmount || 0;
        const totalPaid = summary.find(s => s._id === 'Paid')?.totalAmount || 0;
        const totalOverdue = summary.find(s => s._id === 'Overdue')?.totalAmount || 0;
        
        const chartData = {
            labels: ['Total Paid', 'Total Pending', 'Total Overdue'],
            amounts: [totalPaid, totalPending, totalOverdue],
            totalCollected: totalPaid,
            totalRemaining: totalPending + totalOverdue 
        };

        res.json(chartData);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error generating report summary.');
    }
});


// ----------------------------------------------------
// 5. GET /api/fees/receipt/:id: Get full payment record for receipt (Download Feature)
// @access: Private (Student Only)
// ----------------------------------------------------
router.get('/receipt/:id', protect, async (req, res) => {
    const paymentId = req.params.id;

    if (req.user.role !== 'Student') {
        return res.status(403).json({ msg: 'Access denied. Student account required.' });
    }

    try {
        const paymentRecord = await FeeAssignment.findById(paymentId);
        
        if (!paymentRecord) {
            return res.status(404).json({ msg: 'Payment record not found.' });
        }

        // Security check: Only the owner can view the receipt
        if (paymentRecord.studentId.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Access denied.' });
        }
        
        // Return the payment details as JSON
        res.json(paymentRecord);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error retrieving receipt.');
    }
});


// ----------------------------------------------------
// 6. GET /api/fees/total-students: Admin gets student count
// @access: Private (Admin Only)
// ----------------------------------------------------
router.get('/total-students', protect, admin, async (req, res) => {
    try {
        // Use the User model to count documents where role is 'Student'
        const studentCount = await User.countDocuments({ role: 'Student' });
        res.json({ count: studentCount });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error retrieving student count.');
    }
});

// ----------------------------------------------------
// 7. GET /api/fees/pending-list: Admin gets detailed list of pending/overdue assignments (New Requirement)
// @access: Private (Admin Only)
// ----------------------------------------------------
router.get('/pending-list', protect, admin, async (req, res) => {
    try {
        const pendingList = await FeeAssignment.aggregate([
            {
                // 1. Filter only 'Pending' or 'Overdue' statuses
                $match: {
                    status: { $in: ['Pending', 'Overdue'] }
                }
            },
            {
                // 2. Lookup the student details from the 'users' collection
                $lookup: {
                    from: 'users', // The target collection name (Mongoose pluralizes to lowercase)
                    localField: 'studentId',
                    foreignField: '_id',
                    as: 'studentInfo'
                }
            },
            {
                // 3. Deconstruct the studentInfo array
                $unwind: '$studentInfo'
            },
            {
                // 4. Project (Select) the final fields to return
                $project: {
                    _id: 1,
                    studentId: '$studentInfo._id',
                    studentName: '$studentInfo.name',
                    feeName: 1,
                    amount: 1,
                    dueDate: 1,
                    status: 1
                }
            }
        ]);

        res.json(pendingList);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error retrieving pending list.');
    }
});


module.exports = router;