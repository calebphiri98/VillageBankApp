const db = require('../config/db');

// Calculate and perform Share-Out
const performShareOut = async (req, res) => {
    const { cycle_id } = req.body;
    const distributed_by = req.user.id;

    try {
        // 1. Get the setting: should welfare be included?
        const [setting] = await db.query(
            `SELECT setting_value FROM settings WHERE setting_key = 'include_welfare_in_shareout'`
        );
        const includeWelfare = setting.length > 0 && setting[0].setting_value.toLowerCase() === 'yes';

        // 2. Total Savings
        const [savingsResult] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total_savings FROM savings
        `);
        const totalSavings = parseFloat(savingsResult[0].total_savings);

        // 3. Total Interest from Loans
        const [interestResult] = await db.query(`
            SELECT COALESCE(SUM(amount * interest_rate / 100), 0) as total_interest
            FROM loans
            WHERE status IN ('approved', 'repaid')
        `);
        const totalInterest = parseFloat(interestResult[0].total_interest);

        // 4. Total Fines
        const [finesResult] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total_fines FROM fines
        `);
        const totalFines = parseFloat(finesResult[0].total_fines);

        // 5. Total Welfare (only if setting allows it)
        let totalWelfare = 0;
        if (includeWelfare) {
            const [welfareResult] = await db.query(`
                SELECT COALESCE(SUM(amount), 0) as total_welfare 
                FROM welfare_fund 
                WHERE type = 'contribution'
            `);
            totalWelfare = parseFloat(welfareResult[0].total_welfare);
        }

        const totalFund = totalSavings + totalInterest + totalFines + totalWelfare;

        if (totalFund <= 0) {
            return res.status(400).json({ message: 'No funds available for share-out' });
        }

        // 6. Get each active member’s savings
        const [memberSavings] = await db.query(`
            SELECT m.id as member_id, u.full_name, m.membership_number,
                   COALESCE(SUM(s.amount), 0) as member_savings
            FROM members m
            JOIN users u ON m.user_id = u.id
            LEFT JOIN savings s ON m.id = s.member_id
            WHERE m.status = 'active'
            GROUP BY m.id, u.full_name, m.membership_number
        `);

        if (memberSavings.length === 0) {
            return res.status(400).json({ message: 'No active members found' });
        }

        // 7. Calculate proportional shares
        const shares = memberSavings.map(member => {
            const proportion = totalSavings > 0 ? member.member_savings / totalSavings : 0;
            const shareAmount = proportion * totalFund;

            return {
                member_id: member.member_id,
                full_name: member.full_name,
                membership_number: member.membership_number,
                member_savings: parseFloat(member.member_savings),
                share_amount: parseFloat(shareAmount.toFixed(2))
            };
        });

        // 8. Record the share-out
        const [shareOutResult] = await db.query(
            `INSERT INTO share_out (cycle_id, total_fund, total_members, date_distributed, distributed_by)
             VALUES (?, ?, ?, CURDATE(), ?)`,
            [cycle_id || null, totalFund, memberSavings.length, distributed_by]
        );

        // Audit log
        await db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
             VALUES (?, 'PERFORM_SHARE_OUT', 'share_out', ?, ?)`,
            [distributed_by, shareOutResult.insertId, `Total Fund: ${totalFund}`]
        );

        res.status(201).json({
            message: 'Share-out calculated successfully',
            shareOutId: shareOutResult.insertId,
            welfare_included: includeWelfare,
            breakdown: {
                total_savings: totalSavings,
                total_interest: totalInterest,
                total_fines: totalFines,
                total_welfare: totalWelfare,
                total_fund: totalFund
            },
            total_members: memberSavings.length,
            shares: shares
        });

    } catch (error) {
        res.status(500).json({ message: 'Error performing share-out', error: error.message });
    }
};

// Get all share-out records
const getAllShareOuts = async (req, res) => {
    try {
        const [records] = await db.query(`
            SELECT id, cycle_id, total_fund, total_members, date_distributed, distributed_by
            FROM share_out
            ORDER BY id DESC
        `);
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching share-out records', error: error.message });
    }
};

// Get details of a specific share-out
const getShareOutById = async (req, res) => {
    try {
        const [record] = await db.query(
            `SELECT * FROM share_out WHERE id = ?`,
            [req.params.id]
        );

        if (record.length === 0) {
            return res.status(404).json({ message: 'Share-out record not found' });
        }

        res.json(record[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching share-out', error: error.message });
    }
};

module.exports = {
    performShareOut,
    getAllShareOuts,
    getShareOutById
};