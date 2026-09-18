const { query, one } = require('../config/db');

/** The cycle everything is recorded against right now. */
async function getActiveCycle() {
  return one(`SELECT * FROM cycles WHERE status = 'active' ORDER BY start_date DESC LIMIT 1`);
}

async function getSetting(key, fallback = null) {
  const row = await one(`SELECT setting_value FROM settings WHERE setting_key = $1`, [key]);
  return row ? row.setting_value : fallback;
}

async function setSetting(key, value) {
  await query(
    `INSERT INTO settings (setting_key, setting_value, updated_at)
     VALUES ($1,$2,NOW())
     ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = NOW()`,
    [key, String(value)]
  );
}

const isYes = (v) => String(v).trim().toLowerCase() === 'yes';

/** Total owed on a loan: principal, plus interest only if she opted in. */
function loanTotals(loan) {
  const principal = Number(loan.amount);
  const rate = loan.with_interest ? Number(loan.interest_rate) : 0;
  const interest = +((principal * rate) / 100).toFixed(2);
  return { principal, rate, interest, totalDue: +(principal + interest).toFixed(2) };
}

/** Members with a usable phone number, for group texts. */
async function activeMembersWithPhone() {
  return query(
    `SELECT m.id AS member_id, u.id AS user_id, u.full_name, u.phone, u.language
       FROM members m
       JOIN users u ON u.id = m.user_id
      WHERE m.status = 'active' AND u.is_active = TRUE
        AND u.phone IS NOT NULL AND u.phone <> ''
      ORDER BY u.full_name`
  );
}

/** Turn "Agnes Banda" into a free, unique username like agnesb or agnesb2. */
async function generateUsername(fullName) {
  const parts = String(fullName).toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/);
  let base = (parts[0] || 'member') + (parts[1] ? parts[1][0] : '');
  base = base.slice(0, 14) || 'member';
  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const taken = await one(`SELECT id FROM users WHERE username = $1`, [candidate]);
    if (!taken) return candidate;
    n += 1;
    candidate = `${base}${n}`;
  }
}

/** Next membership number, e.g. VB-0007. */
async function nextMembershipNumber() {
  const row = await one(`SELECT COUNT(*)::int AS c FROM members`);
  return `VB-${String((row?.c || 0) + 1).padStart(4, '0')}`;
}

/** Readable temporary password — no look-alike characters. */
function tempPassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

module.exports = {
  getActiveCycle, getSetting, setSetting, isYes, loanTotals,
  activeMembersWithPhone, generateUsername, nextMembershipNumber, tempPassword,
};
