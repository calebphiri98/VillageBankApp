const express = require('express');
const router = express.Router();
const { 
    createMeeting, 
    getAllMeetings, 
    getMeetingById, 
    getMemberAttendance 
} = require('../controllers/meetingController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Create a meeting (Committee only)
router.post('/', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    createMeeting
);

// Get all meetings
router.get('/', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getAllMeetings
);

// Get a specific meeting with attendance
router.get('/:id', 
    protect, 
    getMeetingById
);

// Get attendance history of a member
router.get('/member/:memberId/attendance', 
    protect, 
    getMemberAttendance
);

module.exports = router;