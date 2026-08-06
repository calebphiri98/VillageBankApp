const express = require('express');
const router = express.Router();
const { sendTestSMS, getSMSHistory } = require('../controllers/smsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Send a test SMS
router.post('/send', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    sendTestSMS
);

// Get SMS history
router.get('/history', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getSMSHistory
);

module.exports = router;