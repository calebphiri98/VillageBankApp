const express = require('express');
const router = express.Router();
const { 
    getAllMembers, 
    getMemberById, 
    createMember, 
    updateMember, 
    deleteMember 
} = require('../controllers/memberController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get all members
router.get('/', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getAllMembers
);

// Get single member
router.get('/:id', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson', 'member'), 
    getMemberById
);

// Create member
router.post('/', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    createMember
);

// Update member
router.put('/:id', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    updateMember
);

// Deactivate member (soft delete)
router.delete('/:id', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    deleteMember
);

module.exports = router;