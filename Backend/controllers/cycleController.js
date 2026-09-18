const { query, one } = require('../config/db');
const { wrap } = require('../middleware/errorHandler');
const { audit } = require('../utils/audit');
const { getActiveCycle } = require('../utils/helpers');

// GET /api/cycles
const listCycles = wrap(async (req, res) => {
  const rows = await query(
    `SELECT c.*, c.share_value::float AS share_value,
            COALESCE((SELECT SUM(s.amount) FROM savings s WHERE s.cycle_id = c.id), 0)::float AS total_savings
       FROM cycles c ORDER BY c.start_date DESC`
  );
  res.json(rows);
});

// GET /api/cycles/active
const activeCycle = wrap(async (req, res) => {
  const cycle = await getActiveCycle();
  if (!cycle) return res.json(null);

  const start = new Date(cycle.start_date);
  const end = new Date(cycle.end_date);
  const now = new Date();
  const totalDays = Math.max(1, Math.round((end - start) / 86400000));
  const elapsed = Math.min(totalDays, Math.max(0, Math.round((now - start) / 86400000)));

  res.json({
    ...cycle,
    share_value: Number(cycle.share_value),
    total_days: totalDays,
    days_elapsed: elapsed,
    days_remaining: Math.max(0, totalDays - elapsed),
    progress: Math.round((elapsed / totalDays) * 100),
  });
});

// POST /api/cycles
const createCycle = wrap(async (req, res) => {
  const { cycle_name, start_date, end_date, share_value } = req.body;
  if (!cycle_name || !start_date) {
    return res.status(400).json({ message: 'Give the cycle a name and a start date.' });
  }

  // A saving period runs one year unless the group says otherwise.
  const start = new Date(start_date);
  const end = end_date ? new Date(end_date) : new Date(new Date(start).setFullYear(start.getFullYear() + 1));
  if (end <= start) return res.status(400).json({ message: 'The end date must come after the start date.' });

  const open = await getActiveCycle();
  if (open) return res.status(400).json({ message: `"${open.cycle_name}" is still running. Close it before starting a new one.` });

  const row = await one(
    `INSERT INTO cycles (cycle_name, start_date, end_date, share_value)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [cycle_name, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10), share_value || 1000]
  );

  await audit(req.user.id, 'CREATE_CYCLE', 'cycles', row.id, cycle_name);
  res.status(201).json({ message: `Cycle "${cycle_name}" started.`, cycle: row });
});

// PATCH /api/cycles/:id/close
const closeCycle = wrap(async (req, res) => {
  const id = Number(req.params.id);
  const cycle = await one(`SELECT * FROM cycles WHERE id = $1`, [id]);
  if (!cycle) return res.status(404).json({ message: 'That cycle does not exist.' });
  if (cycle.status === 'completed') return res.status(400).json({ message: 'That cycle is already closed.' });

  const openLoans = await one(
    `SELECT COUNT(*)::int AS c FROM loans WHERE cycle_id = $1 AND status IN ('pending','approved')`, [id]
  );
  if (openLoans.c > 0) {
    return res.status(400).json({ message: `${openLoans.c} loan(s) are still open in this cycle. Settle them first.` });
  }

  const distributed = await one(
    `SELECT id FROM share_out WHERE cycle_id = $1 AND status = 'distributed' LIMIT 1`, [id]
  );
  if (!distributed) {
    return res.status(400).json({ message: 'Do the share-out before closing the cycle.' });
  }

  await query(`UPDATE cycles SET status = 'completed' WHERE id = $1`, [id]);
  await audit(req.user.id, 'CLOSE_CYCLE', 'cycles', id, cycle.cycle_name);
  res.json({ message: `Cycle "${cycle.cycle_name}" is closed.` });
});

module.exports = { listCycles, activeCycle, createCycle, closeCycle };
