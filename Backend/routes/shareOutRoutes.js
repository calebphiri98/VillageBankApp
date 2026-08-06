const express = require('express');
const router = express.Router();
const { 
    performShareOut, 
    getAllShareOuts, 
    getShareOutById 
} = require('../controllers/shareOutController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Perform Share-Out (Committee only)
router.post('/', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    performShareOut
);

// Get all share-out records
router.get('/', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getAllShareOuts
);

// Get a specific share-out record
router.get('/:id', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getShareOutById
);

module.exports = router;