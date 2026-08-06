const db = require('../config/db');

// Record a welfare contribution
const recordContribution = async (req, res) => {
    const { member_id, amount, date, notes } = req.body;
    const recorded_by = req.user.id;

    try {
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Valid amount is required' });
        }

        const [result] = await db.query(
            `INSERT INTO welfare_fund (member_id, amount, type, date, recorded_by, notes)
             VALUES (?, ?, 'contribution', ?, ?, ?)`,
            [member_id || null, amount, date || new Date(), recorded_by, notes || null]
        );

        // Audit log
        await db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
             VALUES (?, 'WELFARE_CONTRIBUTION', 'welfare_fund', ?, ?)`,
            [recorded_by, result.insertId, `Amount: ${amount}`]
        );

        res.status(201).json({
            message: 'Welfare contribution recorded successfully',
            transactionId: result.insertId
        });
    } catch (error) {
        res.status(500).json({ message: 'Error recording contribution', error: error.message });
    }
};

// Record welfare assistance (payout)
const recordAssistance = async (req, res) => {
    const { member_id, amount, reason, date, notes } = req.body;
    const recorded_by = req.user.id;

    try {
        if (!member_id || !amount || amount <= 0) {
            return res.status(400).json({ message: 'Member ID and valid amount are required' });
        }

        // Check current balance
        const [balanceResult] = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'contribution' THEN amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN type = 'payout' THEN amount ELSE 0 END), 0) as balance
            FROM welfare_fund
        `);
        const currentBalance = parseFloat(balanceResult[0].balance);

        if (amount > currentBalance) {
            return res.status(400).json({ 
                message: `Insufficient welfare fund balance. Available: ${currentBalance.toFixed(2)}` 
            });
        }

        const [result] = await db.query(
            `INSERT INTO welfare_fund (member_id, amount, type, date, recorded_by, notes)
             VALUES (?, ?, 'payout', ?, ?, ?)`,
            [member_id, amount, date || new Date(), recorded_by, reason || notes || null]
        );

        // Audit log
        await db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
             VALUES (?, 'WELFARE_ASSISTANCE', 'welfare_fund', ?, ?)`,
            [recorded_by, result.insertId, `Amount: ${amount}, Reason: ${reason || 'N/A'}`]
        );

        res.status(201).json({
            message: 'Welfare assistance recorded successfully',
            transactionId: result.insertId,
            remaining_balance: currentBalance - amount
        });
    } catch (error) {
        res.status(500).json({ message: 'Error recording assistance', error: error.message });
    }
};

// Get current welfare fund balance
const getWelfareBalance = async (req, res) => {
    try {
        const [result] = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'contribution' THEN amount ELSE 0 END), 0) as total_contributions,
                COALESCE(SUM(CASE WHEN type = 'payout' THEN amount ELSE 0 END), 0) as total_payouts,
                COALESCE(SUM(CASE WHEN type = 'contribution' THEN amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN type = 'payout' THEN amount ELSE 0 END), 0) as current_balance
            FROM welfare_fund
        `);

        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching welfare balance', error: error.message });
    }
};

// Get all welfare transactions (history)
const getWelfareHistory = async (req, res) => {
    try {
        const [transactions] = await db.query(`
            SELECT w.id, w.amount, w.type, w.date, w.notes,
                   m.membership_number, u.full_name
            FROM welfare_fund w
            LEFT JOIN members m ON w.member_id = m.id
            LEFT JOIN users u ON m.user_id = u.id
            ORDER BY w.date DESC, w.id DESC
        `);

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching welfare history', error: error.message });
    }
};

// Get welfare report summary
const getWelfareReport = async (req, res) => {
    try {
        const [summary] = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'contribution' THEN amount ELSE 0 END), 0) as total_contributions,
                COALESCE(SUM(CASE WHEN type = 'payout' THEN amount ELSE 0 END), 0) as total_assistance,
                COALESCE(SUM(CASE WHEN type = 'contribution' THEN amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN type = 'payout' THEN amount ELSE 0 END), 0) as current_balance,
                COUNT(CASE WHEN type = 'contribution' THEN 1 END) as number_of_contributions,
                COUNT(CASE WHEN type = 'payout' THEN 1 END) as number_of_assistances
            FROM welfare_fund
        `);

        res.json(summary[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error generating welfare report', error: error.message });
    }
};

module.exports = {
    recordContribution,
    recordAssistance,
    getWelfareBalance,
    getWelfareHistory,
    getWelfareReport
};