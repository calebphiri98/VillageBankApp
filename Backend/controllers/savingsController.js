const db = require('../config/db');

const recordSaving = async (req, res) => {
    const { member_id, amount, date, cycle_id } = req.body;
    const recorded_by = req.user.id;

    try {
        if (!member_id || !amount || amount <= 0) {
            return res.status(400).json({ message: 'Member ID and a valid amount (greater than 0) are required' });
        }

        // Check if member exists and is active
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
            `INSERT INTO savings (member_id, cycle_id, amount, date, recorded_by) 
             VALUES (?, ?, ?, ?, ?)`,
            [member_id, cycle_id || null, amount, date || new Date(), recorded_by]
        );

        // Audit log
        await db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) 
             VALUES (?, 'RECORD_SAVING', 'savings', ?, ?)`,
            [recorded_by, result.insertId, `Amount: ${amount}`]
        );

        // ===== AUTOMATIC SMS =====
        if (member[0].phone) {
            const { sendSMS } = require('../utils/smsService');
            const message = `Dear ${member[0].full_name}, your savings of MWK ${amount} has been recorded successfully. - Manase VSLA`;
            await sendSMS(member[0].phone, message, recorded_by);
        }

        res.status(201).json({ 
            message: 'Savings recorded successfully', 
            savingId: result.insertId 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error recording savings', error: error.message });
    }
};

// Get all savings
const getAllSavings = async (req, res) => {
    try {
        const [savings] = await db.query(`
            SELECT s.id, s.amount, s.date, s.cycle_id,
                   m.membership_number, u.full_name, u.phone
            FROM savings s
            JOIN members m ON s.member_id = m.id
            JOIN users u ON m.user_id = u.id
            ORDER BY s.date DESC
        `);
        res.json(savings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching savings', error: error.message });
    }
};

// Get savings of a specific member
const getMemberSavings = async (req, res) => {
    try {
        const [savings] = await db.query(`
            SELECT s.id, s.amount, s.date, s.cycle_id
            FROM savings s
            WHERE s.member_id = ?
            ORDER BY s.date DESC
        `, [req.params.memberId]);

        res.json(savings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching member savings', error: error.message });
    }
};

// Get total group savings
const getTotalSavings = async (req, res) => {
    try {
        const [result] = await db.query(`SELECT SUM(amount) AS total_savings FROM savings`);
        res.json({ total_savings: result[0].total_savings || 0 });
    } catch (error) {
        res.status(500).json({ message: 'Error calculating total savings', error: error.message });
    }
};

// Update a saving
const updateSaving = async (req, res) => {
    const { amount, date, cycle_id } = req.body;
    const savingId = req.params.id;
    const updated_by = req.user.id;

    try {
        if (amount !== undefined && amount <= 0) {
            return res.status(400).json({ message: 'Amount must be greater than 0' });
        }

        const [result] = await db.query(
            `UPDATE savings 
             SET amount = COALESCE(?, amount),
                 date = COALESCE(?, date),
                 cycle_id = COALESCE(?, cycle_id)
             WHERE id = ?`,
            [amount, date, cycle_id, savingId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Saving record not found' });
        }

        // Audit log
        await db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) 
             VALUES (?, 'UPDATE_SAVING', 'savings', ?, ?)`,
            [updated_by, savingId, `Updated amount/date`]
        );

        res.json({ message: 'Saving updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating saving', error: error.message });
    }
};

// Delete a saving (hard delete for now + audit)
const deleteSaving = async (req, res) => {
    const savingId = req.params.id;
    const deleted_by = req.user.id;

    try {
        const [result] = await db.query(`DELETE FROM savings WHERE id = ?`, [savingId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Saving record not found' });
        }

        // Audit log
        await db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) 
             VALUES (?, 'DELETE_SAVING', 'savings', ?, 'Saving deleted')`,
            [deleted_by, savingId]
        );

        res.json({ message: 'Saving deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting saving', error: error.message });
    }
};

module.exports = {
    recordSaving,
    getAllSavings,
    getMemberSavings,
    getTotalSavings,
    updateSaving,
    deleteSaving
};