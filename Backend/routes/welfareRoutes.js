const router = require('express').Router();
const c = require('../controllers/welfareController');
const { protect, committee } = require('../middleware/auth');

router.use(protect);
router.get('/', c.listWelfare);
router.get('/balance', c.getBalance);
router.post('/contribution', committee(), c.recordContribution);
router.post('/payout', committee(), c.recordPayout);

module.exports = router;
