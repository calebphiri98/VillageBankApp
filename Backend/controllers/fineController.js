const { query, one } = require('../config/db');
const { wrap } = require('../middleware/errorHandler');
const { sendSMS } = require('../utils/sms');
const { build } = require('../utils/messages');
const { audit } = require('../utils/audit');
const { getActiveCycle } = require('../utils/helpers');

// POST /api/fines
const recordFine = wrap(async (req, res) => {
  const { member_id, amount, reason, date, paid } = req.body;
  if (!member_id || !amount || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Choose a member and enter an amount above zero.' });
  }

  const member = await one(
    `SELECT m.id, u.full_name, u.phone, u.language
       FROM members m JOIN users u ON u.id = m.user_id
      WHERE m.id = $1 AND m.status = 'active'`,
    [member_id]
  );
  if (!member) return res.status(404).json({ message: 'That member is not active.' });

  const cycle = await getActiveCycle();
  const fine = await one(
    `INSERT INTO fines (member_id, cycle_id, amount, reason, paid, date, recorded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, amount::float, date`,
    [member_id, cycle ? cycle.id : null, amount, reason || null, !!paid,
     date || new Date().toISOString().slice(0, 10), req.user.id]
  );

  await audit(req.user.id, 'RECORD_FINE', 'fines', fine.id, `${member.full_name}: ${amount} — ${reason || 'no reason given'}`);

  const sms = await sendSMS(
    member.phone,
    build('fineRecorded', member.language, { name: member.full_name, amount, reason, date: fine.date }),
    { name: member.full_name, category: 'fine', sentBy: req.user.id }
  );

  res.status(201).json({ message: `Fine recorded for ${member.full_name}.`, fine, sms_sent: sms.ok });
});

// GET /api/fines
const listFines = wrap(async (req, res) => {
  const params = [];
  const where = [];
  if (req.user.role === 'member') { params.push(req.user.member_id); where.push(`f.member_id = $${params.length}`); }
  else if (req.query.member_id) { params.push(req.query.member_id); where.push(`f.member_id = $${params.length}`); }

  const rows = await query(
    `SELECT f.id, f.amount::float, f.reason, f.paid, f.date, f.member_id,
            m.membership_number, u.full_name
       FROM fines f JOIN members m ON m.id = f.member_id JOIN users u ON u.id = m.user_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY f.date DESC, f.id DESC`,
    params
  );
  res.json(rows);
});

// PATCH /api/fines/:id/pay
const markPaid = wrap(async (req, res) => {
  const id = Number(req.params.id);
  const updated = await one(`UPDATE fines SET paid = TRUE WHERE id = $1 RETURNING id, amount::float`, [id]);
  if (!updated) return res.status(404).json({ message: 'That fine is not in the book.' });
  await audit(req.user.id, 'FINE_PAID', 'fines', id, `Amount ${updated.amount}`);
  res.json({ message: 'Fine marked as paid.' });
});

// DELETE /api/fines/:id
const deleteFine = wrap(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await one(`SELECT * FROM fines WHERE id = $1`, [id]);
  if (!existing) return res.status(404).json({ message: 'That fine is not in the book.' });
  await query(`DELETE FROM fines WHERE id = $1`, [id]);
  await audit(req.user.id, 'DELETE_FINE', 'fines', id, `Removed ${existing.amount}`);
  res.json({ message: 'Fine removed.' });
});

// GET /api/fines/summary
const finesSummary = wrap(async (req, res) => {
  const row = await one(
    `SELECT COALESCE(SUM(amount),0)::float AS total,
            COALESCE(SUM(CASE WHEN paid THEN amount ELSE 0 END),0)::float AS collected,
            COALESCE(SUM(CASE WHEN NOT paid THEN amount ELSE 0 END),0)::float AS outstanding,
            COUNT(*)::int AS count
       FROM fines`
  );
  res.json(row);
});

module.exports = { recordFine, listFines, markPaid, deleteFine, finesSummary };
