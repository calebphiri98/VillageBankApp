const express = require('express');
const router = express.Router();
const {
    submitJoinRequest,
    getAllJoinRequests,
    getPendingRequests,
    updateJoinRequestStatus
} = require('../controllers/joinRequestController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public route - anyone can submit a request
router.post('/submit', submitJoinRequest);

// Committee only
router.get('/', protect, authorize('admin', 'treasurer', 'secretary', 'chairperson'), getAllJoinRequests);
router.get('/pending', protect, authorize('admin', 'treasurer', 'secretary', 'chairperson'), getPendingRequests);
router.put('/:id/status', protect, authorize('admin', 'treasurer', 'secretary', 'chairperson'), updateJoinRequestStatus);

module.exports = router;