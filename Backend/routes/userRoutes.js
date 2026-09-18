const router = require('express').Router();
const c = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', authorize('admin', 'secretary', 'treasurer'), c.listUsers);
router.post('/', authorize('admin'), c.createUser);
router.patch('/:id', authorize('admin'), c.updateUser);
router.post('/:id/reset-password', authorize('admin'), c.adminResetPassword);
router.post('/:id/unlock', authorize('admin'), c.unlockUser);
router.delete('/:id', authorize('admin'), c.deactivateUser);

module.exports = router;
