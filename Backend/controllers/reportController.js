const db = require('../config/db');

// Main Dashboard Summary
const getDashboardSummary = async (req, res) => {
    try {
        // Total active members
        const [members] = await db.query(`
            SELECT COUNT(*) as total_members FROM members WHERE status = 'active'
        `);

        // Total savings
        const [savings] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total_savings FROM savings
        `);

        // Outstanding loans
        const [loans] = await db.query(`
            SELECT l.amount, l.interest_rate,
                   COALESCE((SELECT SUM(amount) FROM loan_repayments WHERE loan_id = l.id), 0) as total_repaid
            FROM loans l
            WHERE l.status = 'approved'
        `);

        let totalOutstanding = 0;
        let activeLoansCount = 0;

        loans.forEach(loan => {
            const principal = parseFloat(loan.amount);
            const interest = (principal * parseFloat(loan.interest_rate)) / 100;
            const outstanding = (principal + interest) - parseFloat(loan.total_repaid);
            if (outstanding > 0) {
                totalOutstanding += outstanding;
                activeLoansCount++;
            }
        });

        // Welfare balance
        const [welfare] = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'contribution' THEN amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN type = 'payout' THEN amount ELSE 0 END), 0) as welfare_balance
            FROM welfare_fund
        `);

        // Total fines
        const [fines] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total_fines FROM fines
        `);

        // Active cycle
        const [cycle] = await db.query(`
            SELECT cycle_name FROM cycles WHERE status = 'active' ORDER BY id DESC LIMIT 1
        `);

        res.json({
            total_active_members: members[0].total_members,
            total_savings: parseFloat(savings[0].total_savings),
            active_loans: activeLoansCount,
            total_outstanding_loans: parseFloat(totalOutstanding.toFixed(2)),
            welfare_balance: parseFloat(welfare[0].welfare_balance),
            total_fines: parseFloat(fines[0].total_fines),
            active_cycle: cycle.length > 0 ? cycle[0].cycle_name : 'No active cycle'
        });

    } catch (error) {
        res.status(500).json({ message: 'Error generating dashboard summary', error: error.message });
    }
};

// Member financial summary
const getMemberFinancialSummary = async (req, res) => {
    try {
        const memberId = req.params.memberId;

        // Member savings
        const [savings] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total_savings FROM savings WHERE member_id = ?
        `, [memberId]);

        // Member loans
        const [loans] = await db.query(`
            SELECT l.id, l.amount, l.interest_rate, l.status,
                   COALESCE((SELECT SUM(amount) FROM loan_repayments WHERE loan_id = l.id), 0) as total_repaid
            FROM loans l
            WHERE l.member_id = ?
        `, [memberId]);

        const loanDetails = loans.map(loan => {
            const principal = parseFloat(loan.amount);
            const interest = (principal * parseFloat(loan.interest_rate)) / 100;
            const totalDue = principal + interest;
            const outstanding = totalDue - parseFloat(loan.total_repaid);

            return {
                loan_id: loan.id,
                principal: principal,
                interest: interest,
                total_due: totalDue,
                total_repaid: parseFloat(loan.total_repaid),
                outstanding: outstanding > 0 ? outstanding : 0,
                status: loan.status
            };
        });

        // Member fines
        const [fines] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total_fines FROM fines WHERE member_id = ?
        `, [memberId]);

        res.json({
            member_id: memberId,
            total_savings: parseFloat(savings[0].total_savings),
            loans: loanDetails,
            total_fines: parseFloat(fines[0].total_fines)
        });

    } catch (error) {
        res.status(500).json({ message: 'Error generating member summary', error: error.message });
    }
};

module.exports = {
    getDashboardSummary,
    getMemberFinancialSummary
};