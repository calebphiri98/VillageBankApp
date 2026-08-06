const express = require('express');
const router = express.Router();
const { 
    recordContribution, 
    recordAssistance, 
    getWelfareBalance, 
    getWelfareHistory, 
    getWelfareReport 
} = require('../controllers/welfareController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Record a contribution (Committee only)
router.post('/contribute', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    recordContribution
);

// Record welfare assistance / payout (Committee only)
router.post('/assist', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    recordAssistance
);

// Get current balance
router.get('/balance', protect, getWelfareBalance);

// Get full transaction history
router.get('/history', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getWelfareHistory
);

// Get summary report
router.get('/report', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getWelfareReport
);

module.exports = router;