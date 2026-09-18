const bcrypt = require('bcryptjs');
const { query, one, tx } = require('../config/db');
const { wrap } = require('../middleware/errorHandler');
const { sendSMS } = require('../utils/sms');
const { build } = require('../utils/messages');
const { audit } = require('../utils/audit');
const { generateUsername, nextMembershipNumber, tempPassword } = require('../utils/helpers');

const ROLES = ['admin', 'treasurer', 'secretary', 'member'];

// GET /api/users
const listUsers = wrap(async (req, res) => {
  const rows = await query(
    `SELECT u.id, u.username, u.role, u.full_name, u.phone, u.language, u.is_active,
            u.last_login, u.created_at, u.locked_until,
            m.id AS member_id, m.membership_number, m.status AS member_status, m.village
       FROM users u
       LEFT JOIN members m ON m.user_id = u.id
      ORDER BY
        CASE u.role WHEN 'admin' THEN 1 WHEN 'treasurer' THEN 2 WHEN 'secretary' THEN 3 ELSE 4 END,
        u.full_name`
  );
  res.json(rows);
});

// POST /api/users  — the admin adds a woman to the group
const createUser = wrap(async (req, res) => {
  const { full_name, phone, role = 'member', language = 'ny', village, address,
          next_of_kin, next_of_kin_phone, username: wantedUsername, password: wantedPassword } = req.body;

  if (!full_name || !String(full_name).trim()) {
    return res.status(400).json({ message: 'Enter her full name.' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ message: 'Choose a valid role.' });
  }

  let username = String(wantedUsername || '').trim().toLowerCase();
  if (username) {
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ message: 'A username is 3–20 letters, numbers or underscores, no spaces.' });
    }
    const taken = await one(`SELECT id FROM users WHERE username = $1`, [username]);
    if (taken) return res.status(409).json({ message: 'That username is already taken. Try another.' });
  } else {
    username = await generateUsername(full_name);
  }

  const plainPassword = wantedPassword && String(wantedPassword).length >= 6
    ? String(wantedPassword)
    : tempPassword();
  const hashed = await bcrypt.hash(plainPassword, 10);

  const created = await tx(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO users (username, password, role, full_name, phone, language, must_change_password)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE)
       RETURNING id, username, role, full_name, phone, language`,
      [username, hashed, role, String(full_name).trim(), phone || null, language === 'en' ? 'en' : 'ny']
    );
    const user = rows[0];

    // Everyone in the group is also a member — the committee saves too.
    const membershipNumber = await nextMembershipNumber();
    const memberRes = await client.query(
      `INSERT INTO members (user_id, membership_number, village, address, next_of_kin, next_of_kin_phone)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, membership_number`,
      [user.id, membershipNumber, village || null, address || null, next_of_kin || null, next_of_kin_phone || null]
    );

    return { user, member: memberRes.rows[0] };
  });

  await audit(req.user.id, 'CREATE_USER', 'users', created.user.id, `${full_name} as ${role}`);

  let smsResult = { ok: false, error: 'No phone number on file' };
  if (phone) {
    smsResult = await sendSMS(
      phone,
      build('accountCreated', created.user.language, {
        name: created.user.full_name, username, password: plainPassword,
      }),
      { name: created.user.full_name, category: 'account', sentBy: req.user.id }
    );
  }

  res.status(201).json({
    message: `${full_name} has been added.`,
    user: created.user,
    member: created.member,
    // Shown once so the admin can write it down if the SMS did not go through.
    temporary_password: plainPassword,
    sms_sent: smsResult.ok,
    sms_error: smsResult.ok ? null : smsResult.error,
  });
});

// PATCH /api/users/:id
const updateUser = wrap(async (req, res) => {
  const id = Number(req.params.id);
  const { full_name, phone, role, language, is_active, village, address, next_of_kin, next_of_kin_phone, member_status } = req.body;

  const existing = await one(`SELECT * FROM users WHERE id = $1`, [id]);
  if (!existing) return res.status(404).json({ message: 'That person is not on the list.' });

  if (role && !ROLES.includes(role)) {
    return res.status(400).json({ message: 'Choose a valid role.' });
  }

  // Never leave the group without an admin.
  if (existing.role === 'admin' && role && role !== 'admin') {
    const admins = await one(`SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin' AND is_active = TRUE`);
    if (admins.c <= 1) return res.status(400).json({ message: 'This is the only admin. Make someone else an admin first.' });
  }

  await query(
    `UPDATE users SET
       full_name = COALESCE($2, full_name),
       phone     = COALESCE($3, phone),
       role      = COALESCE($4, role),
       language  = COALESCE($5, language),
       is_active = COALESCE($6, is_active)
     WHERE id = $1`,
    [id, full_name || null, phone || null, role || null, language || null,
     typeof is_active === 'boolean' ? is_active : null]
  );

  await query(
    `UPDATE members SET
       village = COALESCE($2, village),
       address = COALESCE($3, address),
       next_of_kin = COALESCE($4, next_of_kin),
       next_of_kin_phone = COALESCE($5, next_of_kin_phone),
       status = COALESCE($6, status)
     WHERE user_id = $1`,
    [id, village || null, address || null, next_of_kin || null, next_of_kin_phone || null, member_status || null]
  );

  await audit(req.user.id, 'UPDATE_USER', 'users', id, full_name || existing.full_name);
  res.json({ message: 'Details saved.' });
});

// POST /api/users/:id/reset-password — admin hands out a new temporary password
const adminResetPassword = wrap(async (req, res) => {
  const id = Number(req.params.id);
  const user = await one(`SELECT * FROM users WHERE id = $1`, [id]);
  if (!user) return res.status(404).json({ message: 'That person is not on the list.' });

  const plain = tempPassword();
  const hashed = await bcrypt.hash(plain, 10);
  await query(
    `UPDATE users SET password = $2, must_change_password = TRUE, failed_attempts = 0, locked_until = NULL
     WHERE id = $1`,
    [id, hashed]
  );

  let sms = { ok: false };
  if (user.phone) {
    sms = await sendSMS(
      user.phone,
      build('accountCreated', user.language, { name: user.full_name, username: user.username, password: plain }),
      { name: user.full_name, category: 'account', sentBy: req.user.id }
    );
  }

  await audit(req.user.id, 'ADMIN_RESET_PASSWORD', 'users', id, user.username);
  res.json({ message: `New password created for ${user.full_name}.`, temporary_password: plain, sms_sent: sms.ok });
});

// POST /api/users/:id/unlock — clear a lockout before the 5 minutes are up
const unlockUser = wrap(async (req, res) => {
  const id = Number(req.params.id);
  await query(`UPDATE users SET locked_until = NULL, failed_attempts = 0 WHERE id = $1`, [id]);
  await audit(req.user.id, 'UNLOCK_USER', 'users', id, null);
  res.json({ message: 'Account unlocked.' });
});

// DELETE /api/users/:id — suspend rather than delete, so the books stay intact
const deactivateUser = wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ message: 'You cannot suspend your own account.' });

  const user = await one(`SELECT * FROM users WHERE id = $1`, [id]);
  if (!user) return res.status(404).json({ message: 'That person is not on the list.' });

  const openLoan = await one(
    `SELECT l.id FROM loans l JOIN members m ON m.id = l.member_id
      WHERE m.user_id = $1 AND l.status IN ('pending','approved') LIMIT 1`,
    [id]
  );
  if (openLoan) return res.status(400).json({ message: 'She still has an open loan. Settle it first.' });

  await query(`UPDATE users SET is_active = FALSE WHERE id = $1`, [id]);
  await query(`UPDATE members SET status = 'inactive' WHERE user_id = $1`, [id]);
  await audit(req.user.id, 'DEACTIVATE_USER', 'users', id, user.full_name);

  res.json({ message: `${user.full_name} has been suspended.` });
});

module.exports = { listUsers, createUser, updateUser, adminResetPassword, unlockUser, deactivateUser };
