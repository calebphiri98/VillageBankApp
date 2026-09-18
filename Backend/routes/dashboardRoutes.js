const router = require('express').Router();
const c = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/', protect, c.getDashboard);

module.exports = router;
