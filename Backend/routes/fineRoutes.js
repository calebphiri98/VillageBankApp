const router = require('express').Router();
const c = require('../controllers/fineController');
const { protect, authorize, committee } = require('../middleware/auth');

router.use(protect);
router.get('/', c.listFines);
router.get('/summary', committee(), c.finesSummary);
router.post('/', committee(), c.recordFine);
router.patch('/:id/pay', committee(), c.markPaid);
router.delete('/:id', authorize('admin'), c.deleteFine);

module.exports = router;
