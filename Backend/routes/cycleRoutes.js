const express = require('express');
const router = express.Router();
const { 
    createCycle, 
    getAllCycles, 
    getActiveCycle, 
    closeCycle, 
    getCycleById 
} = require('../controllers/cycleController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Create a new cycle
router.post('/', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    createCycle
);

// Get all cycles
router.get('/', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getAllCycles
);

// Get the current active cycle
router.get('/active', 
    protect, 
    getActiveCycle
);

// Get a specific cycle
router.get('/:id', 
    protect, 
    getCycleById
);

// Close a cycle
router.put('/:id/close', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    closeCycle
);

module.exports = router;