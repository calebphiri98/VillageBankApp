const router = require('express').Router();
const c = require('../controllers/savingsController');
const { protect, authorize, committee } = require('../middleware/auth');

router.use(protect);
router.get('/', committee(), c.listSavings);
router.get('/summary', committee(), c.savingsSummary);
router.post('/', committee(), c.recordSaving);
router.patch('/:id', authorize('admin', 'treasurer'), c.updateSaving);
router.delete('/:id', authorize('admin'), c.deleteSaving);

module.exports = router;
