// TextBee SMS gateway. Same endpoint and headers as the original working code,
// wrapped so every part of the app can send and everything is logged.
require('dotenv').config();
const { query } = require('../config/db');

const {
  TEXTBEE_API_KEY,
  TEXTBEE_DEVICE_ID,
  SMS_DRY_RUN = 'false',
} = process.env;

const DRY_RUN = String(SMS_DRY_RUN).toLowerCase() === 'true';
const ENDPOINT = 'https://api.textbee.dev/api/v1/gateway/send-sms';

if (!TEXTBEE_API_KEY && !DRY_RUN) {
  console.warn('[sms] TEXTBEE_API_KEY is missing. Set it in .env, or set SMS_DRY_RUN=true to test without sending.');
}

// Malawi numbers are often typed as 0995727978 or 265995727978.
// TextBee wants E.164: +265995727978.
function normalisePhone(raw) {
  if (!raw) return null;
  let p = String(raw).replace(/[\s\-()]/g, '');
  if (p.startsWith('+')) return /^\+[1-9]\d{7,14}$/.test(p) ? p : null;
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith('0')) p = '265' + p.slice(1);        // local Malawi number
  else if (!p.startsWith('265') && p.length === 9) p = '265' + p;
  const e164 = '+' + p;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

async function logSms(row) {
  try {
    await query(
      `INSERT INTO sms_notifications
         (recipient_phone, recipient_name, message, category, is_broadcast, status, error, sent_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [row.phone, row.name || null, row.message, row.category || 'general',
       !!row.isBroadcast, row.status, row.error || null, row.sentBy || null]
    );
  } catch (err) {
    console.error('[sms] could not write log:', err.message);
  }
}

/**
 * Send one SMS. Never throws — a failed text must not roll back a saving
 * that was actually handed over in cash.
 */
async function sendSMS(phone, message, opts = {}) {
  const to = normalisePhone(phone);

  if (!to) {
    await logSms({ ...opts, phone: String(phone || '-'), message, status: 'skipped', error: 'Invalid phone number' });
    return { ok: false, error: 'Invalid phone number' };
  }
  if (!message || !message.trim()) {
    return { ok: false, error: 'Empty message' };
  }

  const text = message.length > 640 ? message.slice(0, 637) + '...' : message;

  if (DRY_RUN) {
    console.log(`\n[sms:dry-run] -> ${to}\n${text}\n`);
    await logSms({ ...opts, phone: to, message: text, status: 'sent' });
    return { ok: true, dryRun: true };
  }

  if (!TEXTBEE_API_KEY) {
    await logSms({ ...opts, phone: to, message: text, status: 'failed', error: 'No TEXTBEE_API_KEY' });
    return { ok: false, error: 'SMS is not configured on the server' };
  }

  try {
    const body = { recipients: [to], message: text };
    if (TEXTBEE_DEVICE_ID) body.deviceId = TEXTBEE_DEVICE_ID;

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': TEXTBEE_API_KEY },
      body: JSON.stringify(body),
    });

    let data = {};
    try { data = await res.json(); } catch { /* gateway returned no JSON */ }

    if (!res.ok || data.success === false) {
      const error = data.message || data.error || 'TextBee refused the message. Is the phone online?';
      await logSms({ ...opts, phone: to, message: text, status: 'failed', error });
      return { ok: false, error };
    }

    await logSms({ ...opts, phone: to, message: text, status: 'sent' });
    return { ok: true };
  } catch (err) {
    await logSms({ ...opts, phone: to, message: text, status: 'failed', error: err.message });
    console.error('[sms] send error:', err.message);
    return { ok: false, error: 'Could not reach TextBee.' };
  }
}

/** Send the same message to many people, one at a time so the gateway keeps up. */
async function sendBulk(recipients, buildMessage, opts = {}) {
  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    const message = typeof buildMessage === 'function' ? buildMessage(r) : buildMessage;
    const result = await sendSMS(r.phone, message, { ...opts, name: r.full_name });
    result.ok ? sent++ : failed++;
    await new Promise((resolve) => setTimeout(resolve, 350)); // be gentle on the gateway
  }
  return { sent, failed, total: recipients.length };
}

module.exports = { sendSMS, sendBulk, normalisePhone, DRY_RUN };
