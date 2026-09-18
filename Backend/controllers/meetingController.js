const { query, one, tx } = require('../config/db');
const { wrap } = require('../middleware/errorHandler');
const { sendBulk } = require('../utils/sms');
const { build } = require('../utils/messages');
const { audit } = require('../utils/audit');
const { getActiveCycle, activeMembersWithPhone } = require('../utils/helpers');

// POST /api/meetings — the secretary calls the group together
const createMeeting = wrap(async (req, res) => {
  const { meeting_date, meeting_time, location, agenda, notes, notify = true } = req.body;
  if (!meeting_date) return res.status(400).json({ message: 'Choose the date of the meeting.' });

  const cycle = await getActiveCycle();
  const meeting = await one(
    `INSERT INTO meetings (cycle_id, meeting_date, meeting_time, location, agenda, notes, recorded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [cycle ? cycle.id : null, meeting_date, meeting_time || null, location || null,
     agenda || null, notes || null, req.user.id]
  );

  await audit(req.user.id, 'CREATE_MEETING', 'meetings', meeting.id, `Meeting on ${meeting_date}`);

  let result = { sent: 0, failed: 0, total: 0 };
  if (notify) {
    const members = await activeMembersWithPhone();
    result = await sendBulk(
      members,
      (m) => build('meetingScheduled', m.language, {
        name: m.full_name, date: meeting_date, time: meeting_time, location,
      }),
      { category: 'meeting', isBroadcast: true, sentBy: req.user.id }
    );
  }

  res.status(201).json({ message: 'Meeting saved.', meeting, notified: result });
});

// GET /api/meetings
const listMeetings = wrap(async (req, res) => {
  const rows = await query(
    `SELECT mt.*, u.full_name AS recorded_by_name,
            (SELECT COUNT(*)::int FROM attendance a WHERE a.meeting_id = mt.id AND a.status = 'present') AS present_count,
            (SELECT COUNT(*)::int FROM attendance a WHERE a.meeting_id = mt.id) AS marked_count
       FROM meetings mt LEFT JOIN users u ON u.id = mt.recorded_by
      ORDER BY mt.meeting_date DESC, mt.id DESC`
  );
  res.json(rows);
});

// GET /api/meetings/:id
const getMeeting = wrap(async (req, res) => {
  const id = Number(req.params.id);
  const meeting = await one(
    `SELECT mt.*, u.full_name AS recorded_by_name
       FROM meetings mt LEFT JOIN users u ON u.id = mt.recorded_by WHERE mt.id = $1`, [id]
  );
  if (!meeting) return res.status(404).json({ message: 'That meeting is not in the book.' });

  const attendance = await query(
    `SELECT m.id AS member_id, m.membership_number, u.full_name,
            COALESCE(a.status, 'absent') AS status
       FROM members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN attendance a ON a.member_id = m.id AND a.meeting_id = $1
      WHERE m.status = 'active'
      ORDER BY u.full_name`,
    [id]
  );
  res.json({ meeting, attendance });
});

// PUT /api/meetings/:id/attendance  { attendance: [{ member_id, status }] }
const saveAttendance = wrap(async (req, res) => {
  const id = Number(req.params.id);
  const list = Array.isArray(req.body.attendance) ? req.body.attendance : [];
  if (!list.length) return res.status(400).json({ message: 'Mark at least one member.' });

  await tx(async (client) => {
    for (const item of list) {
      await client.query(
        `INSERT INTO attendance (meeting_id, member_id, status) VALUES ($1,$2,$3)
         ON CONFLICT (meeting_id, member_id) DO UPDATE SET status = EXCLUDED.status`,
        [id, item.member_id, ['present', 'absent', 'excused'].includes(item.status) ? item.status : 'absent']
      );
    }
  });

  await audit(req.user.id, 'SAVE_ATTENDANCE', 'meetings', id, `${list.length} member(s) marked`);
  res.json({ message: 'Attendance saved.' });
});

// PATCH /api/meetings/:id — the secretary writes up what happened
const updateMinutes = wrap(async (req, res) => {
  const id = Number(req.params.id);
  const { notes, agenda, location, meeting_time } = req.body;
  const updated = await one(
    `UPDATE meetings SET notes = COALESCE($2, notes), agenda = COALESCE($3, agenda),
            location = COALESCE($4, location), meeting_time = COALESCE($5, meeting_time)
      WHERE id = $1 RETURNING id`,
    [id, notes ?? null, agenda ?? null, location ?? null, meeting_time ?? null]
  );
  if (!updated) return res.status(404).json({ message: 'That meeting is not in the book.' });
  await audit(req.user.id, 'UPDATE_MEETING', 'meetings', id, 'Minutes updated');
  res.json({ message: 'Minutes saved.' });
});

module.exports = { createMeeting, listMeetings, getMeeting, saveAttendance, updateMinutes };
