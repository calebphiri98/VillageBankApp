const db = require('../config/db');

// Submit a join request (public - no login required)
const submitJoinRequest = async (req, res) => {
    const { full_name, phone, village, reason } = req.body;

    try {
        if (!full_name || !phone) {
            return res.status(400).json({ message: 'Full name and phone number are required' });
        }

        const [result] = await db.query(
            `INSERT INTO join_requests (full_name, phone, village, reason)
             VALUES (?, ?, ?, ?)`,
            [full_name, phone, village || null, reason || null]
        );

        res.status(201).json({
            message: 'Your request to join has been submitted successfully. The committee will review it.',
            requestId: result.insertId
        });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting request', error: error.message });
    }
};

// Get all join requests (committee only)
const getAllJoinRequests = async (req, res) => {
    try {
        const [requests] = await db.query(`
            SELECT id, full_name, phone, village, reason, status, created_at
            FROM join_requests
            ORDER BY created_at DESC
        `);
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching join requests', error: error.message });
    }
};

// Get only pending requests
const getPendingRequests = async (req, res) => {
    try {
        const [requests] = await db.query(`
            SELECT id, full_name, phone, village, reason, status, created_at
            FROM join_requests
            WHERE status = 'pending'
            ORDER BY created_at DESC
        `);
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pending requests', error: error.message });
    }
};

// Approve or Reject a join request
const updateJoinRequestStatus = async (req, res) => {
    const { status } = req.body;
    const requestId = req.params.id;
    const updated_by = req.user.id;

    try {
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Status must be approved or rejected' });
        }

        const [result] = await db.query(
            `UPDATE join_requests SET status = ? WHERE id = ? AND status = 'pending'`,
            [status, requestId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Pending request not found' });
        }

        // Audit log
        await db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
             VALUES (?, ?, 'join_requests', ?, ?)`,
            [updated_by, status === 'approved' ? 'APPROVE_JOIN_REQUEST' : 'REJECT_JOIN_REQUEST', requestId, `Status: ${status}`]
        );

        res.json({ message: `Join request ${status} successfully` });
    } catch (error) {
        res.status(500).json({ message: 'Error updating request', error: error.message });
    }
};

module.exports = {
    submitJoinRequest,
    getAllJoinRequests,
    getPendingRequests,
    updateJoinRequestStatus
};