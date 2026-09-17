const express = require('express');
const router = express.Router();
const { 
    getDashboardSummary, 
    getMemberFinancialSummary 
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Main Dashboard Summary
router.get('/dashboard', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getDashboardSummary
);

// Member financial summary
// Committee can view any member; ordinary member handled in controller if needed
router.get('/member/:memberId', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson', 'member'), 
    getMemberFinancialSummary
);

module.exports = router;