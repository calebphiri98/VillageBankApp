const express = require('express');
const router = express.Router();
const { 
    getDashboardSummary, 
    getMemberFinancialSummary 
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Main Dashboard Summary (Committee only)
router.get('/dashboard', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getDashboardSummary
);

// Member financial summary
router.get('/member/:memberId', 
    protect, 
    getMemberFinancialSummary
);

module.exports = router;