const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected route example
router.get('/me', protect, (req, res) => {
    res.json({ message: 'You are authenticated', user: req.user });
});

module.exports = router;