const router = require('express').Router();
const c = require('../controllers/meetingController');
const { protect, committee } = require('../middleware/auth');

router.use(protect);
router.get('/', c.listMeetings);
router.get('/:id', c.getMeeting);
router.post('/', committee(), c.createMeeting);
router.patch('/:id', committee(), c.updateMinutes);
router.put('/:id/attendance', committee(), c.saveAttendance);

module.exports = router;
