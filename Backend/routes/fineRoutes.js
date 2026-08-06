const express = require('express');
const router = express.Router();
const { 
    recordFine, 
    getAllFines, 
    getMemberFines, 
    getTotalFines, 
    deleteFine 
} = require('../controllers/fineController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Record a fine (Committee only)
router.post('/', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    recordFine
);

// Get all fines
router.get('/', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getAllFines
);

// Get total fines
router.get('/total', 
    protect, 
    getTotalFines
);

// Get fines of a specific member
router.get('/member/:memberId', 
    protect, 
    getMemberFines
);

// Delete a fine
router.delete('/:id', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    deleteFine
);

module.exports = router;