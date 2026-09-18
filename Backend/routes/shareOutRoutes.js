const router = require('express').Router();
const c = require('../controllers/shareOutController');
const { protect, authorize, committee } = require('../middleware/auth');

router.use(protect);
router.get('/', committee(), c.listShareOuts);
router.get('/mine', c.myShare);
router.get('/preview', committee(), c.preview);
router.post('/', authorize('admin', 'treasurer'), c.createShareOut);
router.post('/:id/distribute', authorize('admin', 'treasurer'), c.distribute);
router.get('/:id', c.getShareOut);

module.exports = router;
