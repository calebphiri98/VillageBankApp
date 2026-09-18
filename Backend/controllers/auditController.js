const { query } = require('../config/db');
const { wrap } = require('../middleware/errorHandler');

// GET /api/audit
const listAudit = wrap(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 150, 500);
  const { action, user_id } = req.query;

  const where = [];
  const params = [];
  if (action) { params.push(action); where.push(`a.action = $${params.length}`); }
  if (user_id) { params.push(user_id); where.push(`a.user_id = $${params.length}`); }
  params.push(limit);

  const rows = await query(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.created_at,
            u.full_name, u.role
       FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY a.created_at DESC LIMIT $${params.length}`,
    params
  );
  res.json(rows);
});

module.exports = { listAudit };
