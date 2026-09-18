const { query, one } = require('../config/db');
const { wrap } = require('../middleware/errorHandler');
const { sendSMS, sendBulk, normalisePhone, DRY_RUN } = require('../utils/sms');
const { audit } = require('../utils/audit');

/**
 * POST /api/sms/send
 * target: 'everyone' | 'role' | 'selected' | 'number'
 * Broadcast means the same words go to the whole group; otherwise it is a
 * private message to one person.
 */
const sendMessage = wrap(async (req, res) => {
  const { target = 'selected', role, member_ids = [], phone, message } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ message: 'Type the message you want to send.' });
  }
  if (String(message).length > 640) {
    return res.status(400).json({ message: 'That message is too long. Keep it under 640 characters.' });
  }

  const text = String(message).trim();

  // One number typed by hand — not part of the group.
  if (target === 'number') {
    if (!normalisePhone(phone)) {
      return res.status(400).json({ message: 'Enter a phone number like 0995727978.' });
    }
    const result = await sendSMS(phone, text, { category: 'manual', isBroadcast: false, sentBy: req.user.id });
    await audit(req.user.id, 'SEND_SMS', 'sms_notifications', null, `To ${phone}`);
    return res.json({
      message: result.ok ? 'Message sent.' : `Not sent: ${result.error}`,
      sent: result.ok ? 1 : 0, failed: result.ok ? 0 : 1, total: 1,
    });
  }

  let recipients = [];

  if (target === 'everyone') {
    recipients = await query(
      `SELECT u.id AS user_id, u.full_name, u.phone
         FROM users u JOIN members m ON m.user_id = u.id
        WHERE u.is_active = TRUE AND m.status = 'active' AND u.phone IS NOT NULL AND u.phone <> ''
        ORDER BY u.full_name`
    );
  } else if (target === 'role') {
    if (!['admin', 'treasurer', 'secretary', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Choose a valid role.' });
    }
    recipients = await query(
      `SELECT id AS user_id, full_name, phone FROM users
        WHERE role = $1 AND is_active = TRUE AND phone IS NOT NULL AND phone <> '' ORDER BY full_name`,
      [role]
    );
  } else {
    const ids = (Array.isArray(member_ids) ? member_ids : [member_ids]).map(Number).filter(Boolean);
    if (!ids.length) return res.status(400).json({ message: 'Choose at least one person.' });
    recipients = await query(
      `SELECT u.id AS user_id, u.full_name, u.phone
         FROM members m JOIN users u ON u.id = m.user_id
        WHERE m.id = ANY($1::int[]) AND u.phone IS NOT NULL AND u.phone <> ''
        ORDER BY u.full_name`,
      [ids]
    );
  }

  if (!recipients.length) {
    return res.status(400).json({ message: 'Nobody in that group has a phone number saved.' });
  }

  const isBroadcast = target === 'everyone' || target === 'role' || recipients.length > 1;
  const result = await sendBulk(recipients, text, {
    category: 'manual', isBroadcast, sentBy: req.user.id,
  });

  await audit(req.user.id, isBroadcast ? 'SEND_BROADCAST' : 'SEND_SMS', 'sms_notifications', null,
    `${result.sent} sent, ${result.failed} failed`);

  res.json({
    message: result.failed
      ? `Sent to ${result.sent} of ${result.total}. ${result.failed} did not go through.`
      : `Sent to ${result.sent} ${result.sent === 1 ? 'person' : 'people'}.`,
    ...result,
  });
});

// GET /api/sms — the message log
const listMessages = wrap(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const rows = await query(
    `SELECT s.id, s.recipient_phone, s.recipient_name, s.message, s.category,
            s.is_broadcast, s.status, s.error, s.sent_at, u.full_name AS sent_by_name
       FROM sms_notifications s LEFT JOIN users u ON u.id = s.sent_by
      ORDER BY s.sent_at DESC LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

// GET /api/sms/stats
const smsStats = wrap(async (req, res) => {
  const row = await one(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
            COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
            COUNT(*) FILTER (WHERE sent_at::date = CURRENT_DATE)::int AS today
       FROM sms_notifications`
  );
  res.json({ ...row, dry_run: DRY_RUN, daily_free_limit: 50 });
});

module.exports = { sendMessage, listMessages, smsStats };
