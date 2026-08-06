const express = require('express');
const router = express.Router();
const { 
    applyLoan, 
    updateLoanStatus, 
    recordRepayment, 
    getAllLoans, 
    getMemberLoans, 
    getOutstandingLoans,
    getLoanRepayments,
    getLoanStatement
} = require('../controllers/loanController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Apply for a loan
router.post('/apply', protect, applyLoan);

// Approve or Reject a loan
router.put('/:id/status', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    updateLoanStatus
);

// Record a repayment
router.post('/repay', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    recordRepayment
);

// Get all loans
router.get('/', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getAllLoans
);

// Get outstanding loans summary
router.get('/outstanding', 
    protect, 
    authorize('admin', 'treasurer', 'secretary', 'chairperson'), 
    getOutstandingLoans
);

// Get loans of a specific member
router.get('/member/:memberId', protect, getMemberLoans);

// Get repayment history of a loan
router.get('/:id/repayments', protect, getLoanRepayments);

// Get full loan statement
router.get('/:id/statement', protect, getLoanStatement);

module.exports = router;