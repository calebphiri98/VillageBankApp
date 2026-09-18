const router = require('express').Router();
const c = require('../controllers/cycleController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', c.listCycles);
router.get('/active', c.activeCycle);
router.post('/', authorize('admin'), c.createCycle);
router.patch('/:id/close', authorize('admin'), c.closeCycle);

module.exports = router;
