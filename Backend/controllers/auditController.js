const db = require('../config/db');

// Get all audit logs (with filters)
const getAllLogs = async (req, res) => {
    try {
        const [logs] = await db.query(`
            SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.timestamp,
                   u.full_name as performed_by, u.username
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.timestamp DESC
            LIMIT 100
        `);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching audit logs', error: error.message });
    }
};

// Get logs by action type (e.g. RECORD_SAVING, APPROVE_LOAN)
const getLogsByAction = async (req, res) => {
    try {
        const [logs] = await db.query(`
            SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.timestamp,
                   u.full_name as performed_by
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.action = ?
            ORDER BY a.timestamp DESC
        `, [req.params.action]);

        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching logs by action', error: error.message });
    }
};

// Get logs for a specific user
const getLogsByUser = async (req, res) => {
    try {
        const [logs] = await db.query(`
            SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.timestamp
            FROM audit_logs a
            WHERE a.user_id = ?
            ORDER BY a.timestamp DESC
        `, [req.params.userId]);

        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user logs', error: error.message });
    }
};

// Get recent activity (last 20)
const getRecentActivity = async (req, res) => {
    try {
        const [logs] = await db.query(`
            SELECT a.id, a.action, a.entity_type, a.details, a.timestamp,
                   u.full_name as performed_by
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.timestamp DESC
            LIMIT 20
        `);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching recent activity', error: error.message });
    }
};

module.exports = {
    getAllLogs,
    getLogsByAction,
    getLogsByUser,
    getRecentActivity
};