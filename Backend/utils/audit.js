const { query } = require('../config/db');

/** Write to the audit trail. Never throws — logging must not break an action. */
async function audit(userId, action, entityType, entityId, details) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1,$2,$3,$4,$5)`,
      [userId || null, action, entityType || null, entityId || null, details || null]
    );
  } catch (err) {
    console.error('[audit] failed:', err.message);
  }
}

module.exports = { audit };
