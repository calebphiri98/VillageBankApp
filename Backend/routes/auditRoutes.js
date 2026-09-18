const router = require('express').Router();
const c = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'secretary', 'treasurer'));
router.get('/', c.listAudit);

module.exports = router;
