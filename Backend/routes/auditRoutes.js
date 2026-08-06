const express = require('express');
const router = express.Router();
const { 
    getAllLogs, 
    getLogsByAction, 
    getLogsByUser, 
    getRecentActivity 
} = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get all audit logs (Committee only)
router.get('/', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getAllLogs
);

// Get recent activity
router.get('/recent', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getRecentActivity
);

// Get logs by action type
router.get('/action/:action', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getLogsByAction
);

// Get logs by user
router.get('/user/:userId', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getLogsByUser
);

module.exports = router;