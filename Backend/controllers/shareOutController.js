const { query, one, tx } = require('../config/db');
const { wrap } = require('../middleware/errorHandler');
const { sendSMS } = require('../utils/sms');
const { build } = require('../utils/messages');
const { audit } = require('../utils/audit');
const { getActiveCycle, getSetting, isYes } = require('../utils/helpers');

/**
 * Work out what the box is worth and what each woman is owed.
 *
 * Savings always come back to the woman who saved them.
 * Interest, fines and welfare are only added to the pot if the group's
 * settings say so — by default interest stays in the box and is not shared,
 * because members can choose to borrow without interest at all.
 */
async function computeShareOut(cycleId) {
  const [shareInterest, shareFines, shareWelfare] = await Promise.all([
    getSetting('include_interest_in_shareout', 'no'),
    getSetting('include_fines_in_shareout', 'yes'),
    getSetting('include_welfare_in_shareout', 'no'),
  ]);

  const cycleFilter = cycleId ? 'cycle_id = $1' : 'TRUE';
  const params = cycleId ? [cycleId] : [];

  const savingsRow = await one(
    `SELECT COALESCE(SUM(amount),0)::float AS total FROM savings WHERE ${cycleFilter}`, params);

  // Interest actually collected, not interest merely charged.
  const interestRow = await one(
    `SELECT COALESCE(SUM(r.interest_part),0)::float AS total
       FROM loan_repayments r JOIN loans l ON l.id = r.loan_id
      WHERE ${cycleId ? 'l.cycle_id = $1' : 'TRUE'}`, params);

  const finesRow = await one(
    `SELECT COALESCE(SUM(amount),0)::float AS total FROM fines WHERE paid = TRUE AND ${cycleFilter}`, params);

  const welfareRow = await one(
    `SELECT (COALESCE(SUM(CASE WHEN type='contribution' THEN amount ELSE 0 END),0)
           - COALESCE(SUM(CASE WHEN type='payout' THEN amount ELSE 0 END),0))::float AS total
       FROM welfare_fund WHERE ${cycleFilter}`, params);

  const totalSavings = savingsRow.total;
  const interestPot = isYes(shareInterest) ? interestRow.total : 0;
  const finesPot = isYes(shareFines) ? finesRow.total : 0;
  const welfarePot = isYes(shareWelfare) ? Math.max(0, welfareRow.total) : 0;
  const profitPot = +(interestPot + finesPot + welfarePot).toFixed(2);
  const totalFund = +(totalSavings + profitPot).toFixed(2);

  const members = await query(
    `SELECT m.id AS member_id, m.membership_number, u.full_name, u.phone, u.language,
            COALESCE((SELECT SUM(s.amount) FROM savings s
                       WHERE s.member_id = m.id AND ${cycleId ? 's.cycle_id = $1' : 'TRUE'}),0)::float AS member_savings,
            COALESCE((SELECT SUM(f.amount) FROM fines f
                       WHERE f.member_id = m.id AND f.paid = FALSE),0)::float AS unpaid_fines,
            COALESCE((SELECT SUM(x.owing) FROM (
                        SELECT (l.amount + CASE WHEN l.with_interest THEN l.amount * l.interest_rate / 100 ELSE 0 END)
                               - COALESCE((SELECT SUM(r.amount) FROM loan_repayments r WHERE r.loan_id = l.id),0) AS owing
                          FROM loans l
                         WHERE l.member_id = m.id AND l.status = 'approved'
                      ) x),0)::float AS unpaid_loan
       FROM members m JOIN users u ON u.id = m.user_id
      WHERE m.status = 'active'
      ORDER BY u.full_name`,
    params
  );

  // Profit is split in proportion to what each woman saved.
  const shares = members.map((m) => {
    const proportion = totalSavings > 0 ? m.member_savings / totalSavings : 0;
    const profitShare = +(proportion * profitPot).toFixed(2);
    const deductions = +(m.unpaid_fines + Math.max(0, m.unpaid_loan)).toFixed(2);
    const shareAmount = +Math.max(0, m.member_savings + profitShare - deductions).toFixed(2);
    return { ...m, proportion: +(proportion * 100).toFixed(2), profit_share: profitShare,
             deductions, share_amount: shareAmount };
  });

  return {
    breakdown: {
      total_savings: totalSavings,
      interest_collected: interestRow.total,
      interest_shared: interestPot,
      fines_collected: finesRow.total,
      fines_shared: finesPot,
      welfare_balance: welfareRow.total,
      welfare_shared: welfarePot,
      profit_pot: profitPot,
      total_fund: totalFund,
    },
    settings: {
      include_interest_in_shareout: shareInterest,
      include_fines_in_shareout: shareFines,
      include_welfare_in_shareout: shareWelfare,
    },
    total_members: members.length,
    shares,
  };
}

// GET /api/shareout/preview — look before you distribute
const preview = wrap(async (req, res) => {
  const cycle = await getActiveCycle();
  if (!cycle) return res.status(400).json({ message: 'No saving cycle is running.' });

  const result = await computeShareOut(cycle.id);

  const openLoans = await one(
    `SELECT COUNT(*)::int AS c FROM loans WHERE cycle_id = $1 AND status IN ('pending','approved')`, [cycle.id]
  );

  res.json({ cycle, ...result, open_loans: openLoans.c });
});

// POST /api/shareout — save the calculation as a draft
const createShareOut = wrap(async (req, res) => {
  const cycle = await getActiveCycle();
  if (!cycle) return res.status(400).json({ message: 'No saving cycle is running.' });

  const existing = await one(
    `SELECT id, status FROM share_out WHERE cycle_id = $1 ORDER BY id DESC LIMIT 1`, [cycle.id]
  );
  if (existing && existing.status === 'distributed') {
    return res.status(400).json({ message: 'This cycle has already been shared out.' });
  }

  const result = await computeShareOut(cycle.id);
  if (result.breakdown.total_fund <= 0) {
    return res.status(400).json({ message: 'There is nothing in the box to share.' });
  }
  if (!result.shares.length) {
    return res.status(400).json({ message: 'There are no active members to share with.' });
  }

  const b = result.breakdown;
  const saved = await tx(async (client) => {
    if (existing) await client.query(`DELETE FROM share_out WHERE id = $1`, [existing.id]);

    const { rows } = await client.query(
      `INSERT INTO share_out (cycle_id, total_savings, total_interest, total_fines, total_welfare,
                              total_fund, total_members, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'draft') RETURNING *`,
      [cycle.id, b.total_savings, b.interest_shared, b.fines_shared, b.welfare_shared,
       b.total_fund, result.total_members]
    );
    const shareOut = rows[0];

    for (const s of result.shares) {
      await client.query(
        `INSERT INTO share_out_details (share_out_id, member_id, member_savings, profit_share, deductions, share_amount)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [shareOut.id, s.member_id, s.member_savings, s.profit_share, s.deductions, s.share_amount]
      );
    }
    return shareOut;
  });

  await audit(req.user.id, 'CREATE_SHAREOUT', 'share_out', saved.id, `Total fund ${b.total_fund}`);
  res.status(201).json({ message: 'Share-out calculated and saved as a draft.', share_out: saved, ...result });
});

/**
 * POST /api/shareout/:id/distribute
 * Hand out the money and text every member her own figure.
 */
const distribute = wrap(async (req, res) => {
  const id = Number(req.params.id);

  const shareOut = await one(`SELECT * FROM share_out WHERE id = $1`, [id]);
  if (!shareOut) return res.status(404).json({ message: 'That share-out does not exist.' });
  if (shareOut.status === 'distributed') {
    return res.status(400).json({ message: 'This share-out has already been handed out.' });
  }

  const lines = await query(
    `SELECT d.*, d.member_savings::float AS member_savings, d.profit_share::float AS profit_share,
            d.share_amount::float AS share_amount,
            u.full_name, u.phone, u.language
       FROM share_out_details d
       JOIN members m ON m.id = d.member_id
       JOIN users u ON u.id = m.user_id
      WHERE d.share_out_id = $1
      ORDER BY u.full_name`,
    [id]
  );

  await query(
    `UPDATE share_out SET status = 'distributed', date_distributed = CURRENT_DATE, distributed_by = $2 WHERE id = $1`,
    [id, req.user.id]
  );

  // Every woman is told her share is ready and exactly how much it is.
  let sent = 0;
  let failed = 0;
  for (const line of lines) {
    const result = await sendSMS(
      line.phone,
      build('shareOutReady', line.language, {
        name: line.full_name, amount: line.share_amount,
        savings: line.member_savings, profit: line.profit_share,
      }),
      { name: line.full_name, category: 'shareout', isBroadcast: true, sentBy: req.user.id }
    );
    if (result.ok) { sent++; await query(`UPDATE share_out_details SET notified = TRUE WHERE id = $1`, [line.id]); }
    else failed++;
    await new Promise((r) => setTimeout(r, 350));
  }

  await audit(req.user.id, 'DISTRIBUTE_SHAREOUT', 'share_out', id,
    `${lines.length} member(s), ${sent} notified`);

  res.json({
    message: `Share-out handed out. ${sent} of ${lines.length} member(s) were texted.`,
    notified: { sent, failed, total: lines.length },
  });
});

// GET /api/shareout
const listShareOuts = wrap(async (req, res) => {
  const rows = await query(
    `SELECT so.*, so.total_fund::float AS total_fund, so.total_savings::float AS total_savings,
            c.cycle_name, u.full_name AS distributed_by_name
       FROM share_out so
       LEFT JOIN cycles c ON c.id = so.cycle_id
       LEFT JOIN users u ON u.id = so.distributed_by
      ORDER BY so.id DESC`
  );
  res.json(rows);
});

// GET /api/shareout/:id
const getShareOut = wrap(async (req, res) => {
  const id = Number(req.params.id);
  const shareOut = await one(
    `SELECT so.*, c.cycle_name, u.full_name AS distributed_by_name
       FROM share_out so LEFT JOIN cycles c ON c.id = so.cycle_id
       LEFT JOIN users u ON u.id = so.distributed_by WHERE so.id = $1`, [id]
  );
  if (!shareOut) return res.status(404).json({ message: 'That share-out does not exist.' });

  const params = [id];
  let filter = '';
  if (req.user.role === 'member') { params.push(req.user.member_id); filter = `AND d.member_id = $2`; }

  const details = await query(
    `SELECT d.*, d.member_savings::float AS member_savings, d.profit_share::float AS profit_share,
            d.deductions::float AS deductions, d.share_amount::float AS share_amount,
            u.full_name, m.membership_number
       FROM share_out_details d
       JOIN members m ON m.id = d.member_id
       JOIN users u ON u.id = m.user_id
      WHERE d.share_out_id = $1 ${filter}
      ORDER BY u.full_name`,
    params
  );
  res.json({ share_out: shareOut, details });
});

// GET /api/shareout/mine — what the logged-in member is owed
const myShare = wrap(async (req, res) => {
  if (!req.user.member_id) return res.json(null);
  const row = await one(
    `SELECT d.member_savings::float AS member_savings, d.profit_share::float AS profit_share,
            d.deductions::float AS deductions, d.share_amount::float AS share_amount, d.notified,
            so.status, so.date_distributed, c.cycle_name
       FROM share_out_details d
       JOIN share_out so ON so.id = d.share_out_id
       LEFT JOIN cycles c ON c.id = so.cycle_id
      WHERE d.member_id = $1 ORDER BY so.id DESC LIMIT 1`,
    [req.user.member_id]
  );
  res.json(row);
});

module.exports = { preview, createShareOut, distribute, listShareOuts, getShareOut, myShare };
