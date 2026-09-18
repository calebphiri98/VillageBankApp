const router = require('express').Router();
const c = require('../controllers/loanController');
const { protect, authorize, committee } = require('../middleware/auth');

router.use(protect);
router.get('/', c.listLoans);                                   // members see their own
router.get('/overdue', committee(), c.overdueLoans);
router.post('/', c.applyLoan);                                  // a member may apply for herself
router.post('/remind', committee(), c.sendReminders);
router.get('/:id', c.getLoan);
router.patch('/:id/decision', authorize('admin', 'treasurer', 'secretary'), c.decideLoan);
router.post('/:id/repayments', authorize('admin', 'treasurer'), c.recordRepayment);

module.exports = router;
