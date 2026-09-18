const router = require('express').Router();
const c = require('../controllers/smsController');
const { protect, committee } = require('../middleware/auth');

router.use(protect, committee());
router.get('/', c.listMessages);
router.get('/stats', c.smsStats);
router.post('/send', c.sendMessage);

module.exports = router;
