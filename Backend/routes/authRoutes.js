const express = require('express');
const router = express.Router();
const { register, login, forgotPassword, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);

// Protected routes
router.get('/me', protect, (req, res) => {
    res.json({ message: 'You are authenticated', user: req.user });
});

router.put('/change-password', protect, changePassword);

module.exports = router;