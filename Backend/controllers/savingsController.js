const { query, one } = require('../config/db');
const { wrap } = require('../middleware/errorHandler');
const { sendSMS } = require('../utils/sms');
const { build } = require('../utils/messages');
const { audit } = require('../utils/audit');
const { getActiveCycle } = require('../utils/helpers');

// POST /api/savings — treasurer or secretary records money handed over at the meeting
const recordSaving = wrap(async (req, res) => {
  const { member_id, amount, shares, date, note } = req.body;
  const recordedBy = req.user.id;

  if (!member_id || !amount || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Choose a member and enter an amount above zero.' });
  }

  const member = await one(
    `SELECT m.id, u.id AS user_id, u.full_name, u.phone, u.language
       FROM members m JOIN users u ON u.id = m.user_id
      WHERE m.id = $1 AND m.status = 'active'`,
    [member_id]
  );
  if (!member) return res.status(404).json({ message: 'That member is not active.' });

  const cycle = await getActiveCycle();
  if (!cycle) return res.status(400).json({ message: 'No saving cycle is running. Start one first.' });

  const saving = await one(
    `INSERT INTO savings (member_id, cycle_id, amount, shares, date, note, recorded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, amount::float, date`,
    [member_id, cycle.id, amount, shares || 1, date || new Date().toISOString().slice(0, 10), note || null, recordedBy]
  );

  const totals = await one(
    `SELECT COALESCE(SUM(amount),0)::float AS total FROM savings WHERE member_id = $1 AND cycle_id = $2`,
    [member_id, cycle.id]
  );

  await audit(recordedBy, 'RECORD_SAVING', 'savings', saving.id,
    `${member.full_name}: ${amount}`);

  // She gets a receipt on her own phone, in her own language.
  const sms = await sendSMS(
    member.phone,
    build('savingRecorded', member.language, {
      name: member.full_name, amount, date: saving.date, total: totals.total,
    }),
    { name: member.full_name, category: 'saving', sentBy: recordedBy }
  );

  res.status(201).json({
    message: `Saving recorded for ${member.full_name}.`,
    saving, member_total: totals.total, sms_sent: sms.ok, sms_error: sms.ok ? null : sms.error,
  });
});

// GET /api/savings
const listSavings = wrap(async (req, res) => {
  const { cycle_id, member_id, limit = 200 } = req.query;
  const where = [];
  const params = [];

  if (cycle_id) { params.push(cycle_id); where.push(`s.cycle_id = $${params.length}`); }
  if (member_id) { params.push(member_id); where.push(`s.member_id = $${params.length}`); }
  params.push(Math.min(Number(limit) || 200, 1000));

  const rows = await query(
    `SELECT s.id, s.amount::float, s.shares, s.date, s.note, s.member_id, s.cycle_id,
            m.membership_number, u.full_name, r.full_name AS recorded_by_name
       FROM savings s
       JOIN members m ON m.id = s.member_id
       JOIN users u ON u.id = m.user_id
       LEFT JOIN users r ON r.id = s.recorded_by
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY s.date DESC, s.id DESC
      LIMIT $${params.length}`,
    params
  );
  res.json(rows);
});

// GET /api/savings/summary
const savingsSummary = wrap(async (req, res) => {
  const cycle = await getActiveCycle();
  const totals = await one(
    `SELECT COALESCE(SUM(amount),0)::float AS total_savings,
            COUNT(*)::int AS entries,
            COUNT(DISTINCT member_id)::int AS savers
       FROM savings WHERE ($1::int IS NULL OR cycle_id = $1)`,
    [cycle ? cycle.id : null]
  );
  const perMember = await query(
    `SELECT m.id AS member_id, u.full_name, m.membership_number,
            COALESCE(SUM(s.amount),0)::float AS total_savings,
            COALESCE(SUM(s.shares),0)::int AS total_shares
       FROM members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN savings s ON s.member_id = m.id AND ($1::int IS NULL OR s.cycle_id = $1)
      WHERE m.status = 'active'
      GROUP BY m.id, u.full_name, m.membership_number
      ORDER BY total_savings DESC`,
    [cycle ? cycle.id : null]
  );
  res.json({ cycle, ...totals, per_member: perMember });
});

// PATCH /api/savings/:id — corrections, admin and treasurer only
const updateSaving = wrap(async (req, res) => {
  const id = Number(req.params.id);
  const { amount, date, note } = req.body;

  if (amount !== undefined && Number(amount) <= 0) {
    return res.status(400).json({ message: 'The amount must be above zero.' });
  }

  const existing = await one(`SELECT * FROM savings WHERE id = $1`, [id]);
  if (!existing) return res.status(404).json({ message: 'That entry is not in the book.' });

  await query(
    `UPDATE savings SET amount = COALESCE($2, amount), date = COALESCE($3, date), note = COALESCE($4, note)
      WHERE id = $1`,
    [id, amount ?? null, date ?? null, note ?? null]
  );

  await audit(req.user.id, 'UPDATE_SAVING', 'savings', id,
    `was ${existing.amount}, now ${amount ?? existing.amount}`);
  res.json({ message: 'Entry corrected.' });
});

// DELETE /api/savings/:id
const deleteSaving = wrap(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await one(`SELECT * FROM savings WHERE id = $1`, [id]);
  if (!existing) return res.status(404).json({ message: 'That entry is not in the book.' });

  await query(`DELETE FROM savings WHERE id = $1`, [id]);
  await audit(req.user.id, 'DELETE_SAVING', 'savings', id,
    `Removed ${existing.amount} for member ${existing.member_id}`);
  res.json({ message: 'Entry removed.' });
});

module.exports = { recordSaving, listSavings, savingsSummary, updateSaving, deleteSaving };
