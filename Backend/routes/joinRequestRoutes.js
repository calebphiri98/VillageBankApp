const router = require('express').Router();
const c = require('../controllers/joinRequestController');
const { protect, committee } = require('../middleware/auth');

router.post('/', c.submitRequest);                  // public: no login
router.get('/', protect, c.listRequests);
router.post('/:id/vote', protect, c.vote);          // every member gets a say
router.patch('/:id', protect, committee(), c.decideRequest);

module.exports = router;
