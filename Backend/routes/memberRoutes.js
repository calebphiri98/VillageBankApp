const router = require('express').Router();
const c = require('../controllers/memberController');
const { protect, committee } = require('../middleware/auth');

router.use(protect);
router.get('/', c.listMembers);
router.get('/me', c.getMyRecord);
router.get('/:id', c.getMember);

module.exports = router;
