const router = require('express').Router();
const c = require('../controllers/settingsController');
const { protect, authorize, committee } = require('../middleware/auth');

router.use(protect);
router.get('/', committee(), c.listSettings);
router.put('/', authorize('admin'), c.updateSettings);

module.exports = router;
