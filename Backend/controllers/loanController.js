const { query, one, tx } = require('../config/db');
const { wrap } = require('../middleware/errorHandler');
const { sendSMS } = require('../utils/sms');
const { build } = require('../utils/messages');
const { audit } = require('../utils/audit');
const { getActiveCycle, getSetting, loanTotals } = require('../utils/helpers');

const withBalance = (loan) => {
  const { interest, totalDue } = loanTotals(loan);
  const repaid = Number(loan.total_repaid || 0);
  return {
    ...loan,
    amount: Number(loan.amount),
    interest_rate: Number(loan.interest_rate),
    interest_amount: interest,
    total_due: totalDue,
    total_repaid: repaid,
    outstanding: Math.max(0, +(totalDue - repaid).toFixed(2)),
  };
};

// POST /api/loans — a member borrows from the group's own money
const applyLoan = wrap(async (req, res) => {
  const { member_id, amount, with_interest = true, purpose, due_date } = req.body;

  // A member may only borrow for herself; the committee may file on her behalf.
  const borrowerId = req.user.role === 'member' ? req.user.member_id : Number(member_id);
  if (!borrowerId) return res.status(400).json({ message: 'Choose who the loan is for.' });
  if (!amount || Number(amount) <= 0) return res.status(400).json({ message: 'Enter an amount above zero.' });

  const member = await one(
    `SELECT m.id, u.full_name, u.phone, u.language
       FROM members m JOIN users u ON u.id = m.user_id
      WHERE m.id = $1 AND m.status = 'active'`,
    [borrowerId]
  );
  if (!member) return res.status(404).json({ message: 'That member is not active.' });

  const openLoan = await one(
    `SELECT id, status FROM loans WHERE member_id = $1 AND status IN ('pending','approved')`,
    [borrowerId]
  );
  if (openLoan) {
    return res.status(400).json({
      message: openLoan.status === 'pending'
        ? 'There is already a loan request waiting for the committee.'
        : 'This loan must be repaid before borrowing again.',
    });
  }

  const cycle = await getActiveCycle();
  if (!cycle) return res.status(400).json({ message: 'No saving cycle is running.' });

  const savingsRow = await one(
    `SELECT COALESCE(SUM(amount),0)::float AS total FROM savings WHERE member_id = $1`, [borrowerId]
  );
  const totalSavings = savingsRow.total;
  if (totalSavings <= 0) {
    return res.status(400).json({ message: 'She has not saved anything yet, so she cannot borrow.' });
  }

  const multiplier = Number(await getSetting('loan_multiplier', '3'));
  const maxLoan = +(totalSavings * multiplier).toFixed(2);
  if (Number(amount) > maxLoan) {
    return res.status(400).json({
      message: `The most she can borrow is ${maxLoan.toLocaleString()} — ${multiplier} times her savings of ${totalSavings.toLocaleString()}.`,
      max_allowed: maxLoan, member_savings: totalSavings,
    });
  }

  // Everything must come back before the cycle closes.
  const cycleEnd = new Date(cycle.end_date);
  let due = due_date ? new Date(due_date) : null;
  if (!due) {
    due = new Date(Math.min(Date.now() + 90 * 86400000, cycleEnd.getTime()));
  }
  if (due > cycleEnd) {
    return res.status(400).json({
      message: `The repayment date must be on or before ${cycleEnd.toISOString().slice(0, 10)}, when the cycle ends.`,
    });
  }
  if (due <= new Date(Date.now() - 86400000)) {
    return res.status(400).json({ message: 'The repayment date must be in the future.' });
  }

  const defaultRate = Number(await getSetting('default_interest_rate', '10'));
  const carriesInterest = with_interest !== false && String(with_interest) !== 'false';

  const loan = await one(
    `INSERT INTO loans (member_id, cycle_id, amount, with_interest, interest_rate, purpose, due_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING *`,
    [borrowerId, cycle.id, amount, carriesInterest, carriesInterest ? defaultRate : 0,
     purpose || null, due.toISOString().slice(0, 10)]
  );

  await audit(req.user.id, 'APPLY_LOAN', 'loans', loan.id,
    `${member.full_name}: ${amount}, interest ${carriesInterest ? defaultRate + '%' : 'none'}`);

  await sendSMS(member.phone, build('loanApplied', member.language, { name: member.full_name, amount }),
    { name: member.full_name, category: 'loan', sentBy: req.user.id });

  res.status(201).json({
    message: 'Loan request sent to the committee.',
    loan: withBalance({ ...loan, total_repaid: 0 }),
    max_allowed: maxLoan, member_savings: totalSavings,
  });
});

// PATCH /api/loans/:id/decision  { status: 'approved' | 'rejected', note }
const decideLoan = wrap(async (req, res) => {
  const id = Number(req.params.id);
  const { status, note } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'The decision must be approved or rejected.' });
  }

  const loan = await one(
    `SELECT l.*, u.full_name, u.phone, u.language
       FROM loans l JOIN members m ON m.id = l.member_id JOIN users u ON u.id = m.user_id
      WHERE l.id = $1`,
    [id]
  );
  if (!loan) return res.status(404).json({ message: 'That loan request does not exist.' });
  if (loan.status !== 'pending') {
    return res.status(400).json({ message: 'That request has already been decided.' });
  }

  // Do not lend out money the box does not have.
  if (status === 'approved') {
    const box = await one(
      `SELECT
         COALESCE((SELECT SUM(amount) FROM savings),0)
       + COALESCE((SELECT SUM(amount) FROM fines WHERE paid = TRUE),0)
       + COALESCE((SELECT SUM(amount) FROM loan_repayments),0)
       - COALESCE((SELECT SUM(amount) FROM loans WHERE status IN ('approved','repaid','defaulted')),0)
         AS cash`
    );
    const available = Number(box.cash || 0);
    if (Number(loan.amount) > available) {
      return res.status(400).json({
        message: `The box only has ${available.toLocaleString()} available. That is less than this loan.`,
        available,
      });
    }
  }

  await query(
    `UPDATE loans SET status = $2, decision_note = $3, decided_at = NOW(), approved_by = $4 WHERE id = $1`,
    [id, status, note || null, req.user.id]
  );

  await audit(req.user.id, status === 'approved' ? 'APPROVE_LOAN' : 'REJECT_LOAN', 'loans', id,
    `${loan.full_name}: ${loan.amount}${note ? ' — ' + note : ''}`);

  const { totalDue } = loanTotals(loan);
  const sms = await sendSMS(
    loan.phone,
    status === 'approved'
      ? build('loanApproved', loan.language, {
          name: loan.full_name, amount: loan.amount, totalDue, dueDate: loan.due_date })
      : build('loanRejected', loan.language, { name: loan.full_name, amount: loan.amount, note }),
    { name: loan.full_name, category: 'loan', sentBy: req.user.id }
  );

  res.json({
    message: status === 'approved'
      ? `Loan approved. ${loan.full_name} has been told.`
      : `Loan turned down. ${loan.full_name} has been told.`,
    sms_sent: sms.ok,
  });
});

// POST /api/loans/:id/repayments
const recordRepayment = wrap(async (req, res) => {
  const loanId = Number(req.params.id);
  const { amount, date } = req.body;

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Enter an amount above zero.' });
  }

  const loan = await one(
    `SELECT l.*, u.full_name, u.phone, u.language
       FROM loans l JOIN members m ON m.id = l.member_id JOIN users u ON u.id = m.user_id
      WHERE l.id = $1`,
    [loanId]
  );
  if (!loan) return res.status(404).json({ message: 'That loan does not exist.' });
  if (loan.status !== 'approved') {
    return res.status(400).json({ message: 'Only an approved loan can take repayments.' });
  }

  const paidRow = await one(
    `SELECT COALESCE(SUM(amount),0)::float AS paid,
            COALESCE(SUM(principal_part),0)::float AS principal_paid
       FROM loan_repayments WHERE loan_id = $1`,
    [loanId]
  );

  const { principal, interest, totalDue } = loanTotals(loan);
  const remaining = +(totalDue - paidRow.paid).toFixed(2);
  const pay = Number(amount);

  if (pay > remaining + 0.01) {
    return res.status(400).json({
      message: `That is more than she owes. The balance is ${remaining.toLocaleString()}.`,
      remaining,
    });
  }

  // Principal comes off first; what is left over is interest, banked separately
  // because interest does not go back into anyone's savings.
  const principalOwing = Math.max(0, +(principal - paidRow.principal_paid).toFixed(2));
  const principalPart = Math.min(pay, principalOwing);
  const interestPart = +(pay - principalPart).toFixed(2);

  const result = await tx(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO loan_repayments (loan_id, amount, principal_part, interest_part, date, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, amount::float, date`,
      [loanId, pay, principalPart, interestPart, date || new Date().toISOString().slice(0, 10), req.user.id]
    );

    const newPaid = +(paidRow.paid + pay).toFixed(2);
    if (newPaid >= totalDue - 0.01) {
      await client.query(`UPDATE loans SET status = 'repaid' WHERE id = $1`, [loanId]);
    }
    return { repayment: rows[0], newPaid, cleared: newPaid >= totalDue - 0.01 };
  });

  await audit(req.user.id, 'RECORD_REPAYMENT', 'loan_repayments', result.repayment.id,
    `${loan.full_name}: ${pay} (principal ${principalPart}, interest ${interestPart})`);

  const stillOwing = Math.max(0, +(totalDue - result.newPaid).toFixed(2));
  await sendSMS(
    loan.phone,
    result.cleared
      ? build('loanCleared', loan.language, { name: loan.full_name })
      : build('repaymentRecorded', loan.language, { name: loan.full_name, amount: pay, remaining: stillOwing }),
    { name: loan.full_name, category: 'loan', sentBy: req.user.id }
  );

  res.status(201).json({
    message: result.cleared ? 'Loan fully repaid.' : 'Repayment recorded.',
    repayment: result.repayment,
    total_due: totalDue, total_repaid: result.newPaid, outstanding: stillOwing,
    interest_banked: interestPart, interest_total: interest, cleared: result.cleared,
  });
});

// GET /api/loans
const listLoans = wrap(async (req, res) => {
  const { status, member_id } = req.query;
  const where = [];
  const params = [];

  // A member only ever sees her own loans.
  if (req.user.role === 'member') { params.push(req.user.member_id); where.push(`l.member_id = $${params.length}`); }
  else if (member_id) { params.push(member_id); where.push(`l.member_id = $${params.length}`); }
  if (status) { params.push(status); where.push(`l.status = $${params.length}`); }

  const rows = await query(
    `SELECT l.*, m.membership_number, u.full_name, u.phone,
            COALESCE((SELECT SUM(r.amount) FROM loan_repayments r WHERE r.loan_id = l.id),0)::float AS total_repaid,
            a.full_name AS decided_by_name
       FROM loans l
       JOIN members m ON m.id = l.member_id
       JOIN users u ON u.id = m.user_id
       LEFT JOIN users a ON a.id = l.approved_by
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY
        CASE l.status WHEN 'pending' THEN 1 WHEN 'approved' THEN 2 ELSE 3 END,
        l.id DESC`,
    params
  );
  res.json(rows.map(withBalance));
});

// GET /api/loans/:id
const getLoan = wrap(async (req, res) => {
  const id = Number(req.params.id);
  const loan = await one(
    `SELECT l.*, m.membership_number, u.full_name, u.phone,
            COALESCE((SELECT SUM(r.amount) FROM loan_repayments r WHERE r.loan_id = l.id),0)::float AS total_repaid
       FROM loans l JOIN members m ON m.id = l.member_id JOIN users u ON u.id = m.user_id
      WHERE l.id = $1`,
    [id]
  );
  if (!loan) return res.status(404).json({ message: 'That loan does not exist.' });
  if (req.user.role === 'member' && loan.member_id !== req.user.member_id) {
    return res.status(403).json({ message: 'You can only view your own loans.' });
  }

  const repayments = await query(
    `SELECT r.id, r.amount::float, r.principal_part::float, r.interest_part::float, r.date, u.full_name AS recorded_by_name
       FROM loan_repayments r LEFT JOIN users u ON u.id = r.recorded_by
      WHERE r.loan_id = $1 ORDER BY r.date, r.id`,
    [id]
  );
  res.json({ loan: withBalance(loan), repayments });
});

// GET /api/loans/overdue — who has not paid before the cycle ends
const overdueLoans = wrap(async (req, res) => {
  const rows = await query(
    `SELECT l.*, u.full_name, u.phone, u.language, m.membership_number,
            COALESCE((SELECT SUM(r.amount) FROM loan_repayments r WHERE r.loan_id = l.id),0)::float AS total_repaid
       FROM loans l JOIN members m ON m.id = l.member_id JOIN users u ON u.id = m.user_id
      WHERE l.status = 'approved' AND l.due_date < CURRENT_DATE
      ORDER BY l.due_date`
  );
  res.json(rows.map(withBalance));
});

// POST /api/loans/remind — text everyone whose loan is due soon or late
const sendReminders = wrap(async (req, res) => {
  const days = Number(req.body.within_days || 7);
  const rows = await query(
    `SELECT l.*, u.full_name, u.phone, u.language,
            COALESCE((SELECT SUM(r.amount) FROM loan_repayments r WHERE r.loan_id = l.id),0)::float AS total_repaid
       FROM loans l JOIN members m ON m.id = l.member_id JOIN users u ON u.id = m.user_id
      WHERE l.status = 'approved' AND l.due_date <= CURRENT_DATE + ($1 || ' days')::interval`,
    [String(days)]
  );

  let sent = 0;
  for (const raw of rows) {
    const loan = withBalance(raw);
    if (loan.outstanding <= 0) continue;
    const result = await sendSMS(
      loan.phone,
      build('loanDueSoon', loan.language, { name: loan.full_name, outstanding: loan.outstanding, dueDate: loan.due_date }),
      { name: loan.full_name, category: 'loan_reminder', sentBy: req.user.id }
    );
    if (result.ok) sent++;
    await new Promise((r) => setTimeout(r, 350));
  }

  await audit(req.user.id, 'SEND_LOAN_REMINDERS', 'loans', null, `${sent} reminder(s)`);
  res.json({ message: `${sent} reminder(s) sent.`, sent, considered: rows.length });
});

module.exports = {
  applyLoan, decideLoan, recordRepayment, listLoans, getLoan, overdueLoans, sendReminders,
};
