const db = require('../config/db');

// Record a fine
const recordFine = async (req, res) => {
    const { member_id, amount, reason, date } = req.body;
    const recorded_by = req.user.id;

    try {
        if (!member_id || !amount || amount <= 0) {
            return res.status(400).json({ message: 'Member ID and a valid amount are required' });
        }

        // Get member details
        const [member] = await db.query(
            `SELECT m.id, u.full_name, u.phone 
             FROM members m 
             JOIN users u ON m.user_id = u.id 
             WHERE m.id = ? AND m.status = 'active'`,
            [member_id]
        );

        if (member.length === 0) {
            return res.status(404).json({ message: 'Active member not found' });
        }

        const [result] = await db.query(
            `INSERT INTO fines (member_id, amount, reason, date, recorded_by)
             VALUES (?, ?, ?, ?, ?)`,
            [member_id, amount, reason || null, date || new Date(), recorded_by]
        );

        // Audit log
        await db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
             VALUES (?, 'RECORD_FINE', 'fines', ?, ?)`,
            [recorded_by, result.insertId, `Amount: ${amount}, Reason: ${reason || 'N/A'}`]
        );

        // ===== AUTOMATIC SMS =====
        if (member[0].phone) {
            const { sendSMS } = require('../utils/smsService');
            const message = `Dear ${member[0].full_name}, a fine of MWK ${amount} has been recorded. Reason: ${reason || 'Not specified'}. - Manase VSLA`;
            await sendSMS(member[0].phone, message, recorded_by);
        }

        res.status(201).json({
            message: 'Fine recorded successfully',
            fineId: result.insertId
        });
    } catch (error) {
        res.status(500).json({ message: 'Error recording fine', error: error.message });
    }
};

// Get all fines
const getAllFines = async (req, res) => {
    try {
        const [fines] = await db.query(`
            SELECT f.id, f.amount, f.reason, f.date,
                   m.membership_number, u.full_name
            FROM fines f
            JOIN members m ON f.member_id = m.id
            JOIN users u ON m.user_id = u.id
            ORDER BY f.date DESC
        `);
        res.json(fines);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching fines', error: error.message });
    }
};

// Get fines of a specific member
const getMemberFines = async (req, res) => {
    try {
        const [fines] = await db.query(`
            SELECT id, amount, reason, date
            FROM fines
            WHERE member_id = ?
            ORDER BY date DESC
        `, [req.params.memberId]);

        res.json(fines);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching member fines', error: error.message });
    }
};

// Get total fines
const getTotalFines = async (req, res) => {
    try {
        const [result] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total_fines FROM fines
        `);
        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error calculating total fines', error: error.message });
    }
};

// Delete a fine (optional - for corrections)
const deleteFine = async (req, res) => {
    const fineId = req.params.id;
    const deleted_by = req.user.id;

    try {
        const [result] = await db.query(`DELETE FROM fines WHERE id = ?`, [fineId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Fine not found' });
        }

        await db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
             VALUES (?, 'DELETE_FINE', 'fines', ?, 'Fine deleted')`,
            [deleted_by, fineId]
        );

        res.json({ message: 'Fine deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting fine', error: error.message });
    }
};

module.exports = {
    recordFine,
    getAllFines,
    getMemberFines,
    getTotalFines,
    deleteFine
};