const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Slow down anyone hammering the login or reset endpoints from one machine.
const tight = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts from this device. Wait a few minutes.' },
});

router.post('/login', tight, c.login);
router.post('/forgot', tight, c.forgotPassword);
router.post('/reset', tight, c.resetPassword);
router.get('/me', protect, c.me);
router.post('/change-password', protect, c.changePassword);
router.patch('/language', protect, c.setLanguage);

module.exports = router;
