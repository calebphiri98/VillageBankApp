const express = require('express');
const router = express.Router();
const { 
    recordSaving, 
    getAllSavings, 
    getMemberSavings, 
    getTotalSavings,
    updateSaving,
    deleteSaving
} = require('../controllers/savingsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Record a new saving (Committee only)
router.post('/', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    recordSaving
);

// Get all savings (Committee only)
router.get('/', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getAllSavings
);

// Get total group savings (Anyone logged in)
router.get('/total', 
    protect, 
    getTotalSavings
);

// Get savings of a specific member
// Ordinary members can only view their own savings
router.get('/member/:memberId', 
    protect, 
    async (req, res, next) => {
        // If the user is an ordinary member, they can only see their own records
        if (req.user.role === 'member') {
            // We need to find the member_id linked to this user
            const db = require('../config/db');
            const [rows] = await db.query(
                `SELECT id FROM members WHERE user_id = ?`, 
                [req.user.id]
            );

            if (rows.length === 0 || rows[0].id != req.params.memberId) {
                return res.status(403).json({ message: 'You can only view your own savings' });
            }
        }
        next();
    },
    getMemberSavings
);

// Update a saving (Committee only)
router.put('/:id', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    updateSaving
);

// Delete a saving (Committee only)
router.delete('/:id', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    deleteSaving
);

module.exports = router;