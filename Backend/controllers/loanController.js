const db = require('../config/db');

// Apply for a loan (with borrowing conditions)
// Apply for a loan (with borrowing conditions)
const applyLoan = async (req, res) => {
    const { member_id, amount, interest_rate, due_date } = req.body;
    const applied_by = req.user.id;

    try {
        if (!member_id || !amount || amount <= 0) {
            return res.status(400).json({ message: 'Member ID and a valid amount are required' });
        }

        // 1. Check if member exists and is active
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

        // 2. Check if member already has a pending or approved loan
        const [existingLoan] = await db.query(
            `SELECT id, status FROM loans 
             WHERE member_id = ? AND status IN ('pending', 'approved')`,
            [member_id]
        );

        if (existingLoan.length > 0) {
            return res.status(400).json({ 
                message: `Member already has a ${existingLoan[0].status} loan. Cannot apply for a new one.` 
            });
        }

        // 3. Get member's total savings
        const [savingsResult] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total_savings 
             FROM savings WHERE member_id = ?`,
            [member_id]
        );
        const totalSavings = parseFloat(savingsResult[0].total_savings);

        // 4. Borrowing limit: Maximum loan = 3 × total savings
        const maxLoanAmount = totalSavings * 3;

        if (totalSavings <= 0) {
            return res.status(400).json({ 
                message: 'Member has no savings. Cannot apply for a loan.' 
            });
        }

        if (parseFloat(amount) > maxLoanAmount) {
            return res.status(400).json({ 
                message: `Loan amount exceeds the allowed limit. Maximum allowed is MWK ${maxLoanAmount.toLocaleString()} (3 × savings of MWK ${totalSavings.toLocaleString()})` 
            });
        }

        // 5. Create the loan application (without applied_by to avoid column errors)
        const [result] = await db.query(
            `INSERT INTO loans (member_id, amount, interest_rate, status, due_date)
             VALUES (?, ?, ?, 'pending', ?)`,
            [member_id, amount, interest_rate || 10, due_date || null]
        );

        // Audit log
        await db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
             VALUES (?, 'APPLY_LOAN', 'loans', ?, ?)`,
            [applied_by, result.insertId, `Amount: ${amount}`]
        );

        res.status(201).json({
            message: 'Loan application submitted successfully',
            loanId: result.insertId,
            max_allowed: maxLoanAmount,
            member_savings: totalSavings
        });

    } catch (error) {
        console.error('Apply Loan Error:', error.message);
        res.status(500).json({ 
            message: 'Error applying for loan', 
            error: error.message 
        });
    }
};
// Reject or approve loan
// Approve or Reject a loan
const updateLoanStatus = async (req, res) => {
    const { status } = req.body;
    const loanId = req.params.id;
    const updated_by = req.user.id;

    try {
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Status must be approved or rejected' });
        }

        // Get loan + member details before updating
        const [loanData] = await db.query(`
            SELECT l.amount, l.status, u.full_name, u.phone
            FROM loans l
            JOIN members m ON l.member_id = m.id
            JOIN users u ON m.user_id = u.id
            WHERE l.id = ?
        `, [loanId]);

        if (loanData.length === 0) {
            return res.status(404).json({ message: 'Loan not found' });
        }

        if (loanData[0].status !== 'pending') {
            return res.status(400).json({ message: 'Only pending loans can be approved or rejected' });
        }

        // Update status only (no approved_by column to avoid errors)
        const [result] = await db.query(
            `UPDATE loans SET status = ? WHERE id = ? AND status = 'pending'`,
            [status, loanId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Pending loan not found' });
        }

        // Audit log
        await db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) 
             VALUES (?, ?, 'loans', ?, ?)`,
            [updated_by, status === 'approved' ? 'APPROVE_LOAN' : 'REJECT_LOAN', loanId, `Status changed to ${status}`]
        );

        // Automatic SMS
        if (loanData[0].phone) {
            try {
                const { sendSMS } = require('../utils/smsService');
                let message = '';

                if (status === 'approved') {
                    message = `Dear ${loanData[0].full_name}, your loan of MWK ${loanData[0].amount} has been APPROVED. - Manase VSLA`;
                } else {
                    message = `Dear ${loanData[0].full_name}, your loan application of MWK ${loanData[0].amount} has been REJECTED. - Manase VSLA`;
                }

                await sendSMS(loanData[0].phone, message, updated_by);
            } catch (smsError) {
                console.error('SMS failed:', smsError.message);
            }
        }

        res.json({ message: `Loan ${status} successfully` });
    } catch (error) {
        console.error('Update Loan Status Error:', error.message);
        res.status(500).json({ message: 'Error updating loan status', error: error.message });
    }
};

// Record a loan repayment (Improved)
const recordRepayment = async (req, res) => {
    const { loan_id, amount, date } = req.body;
    const recorded_by = req.user.id;

    try {
        if (!loan_id || !amount || amount <= 0) {
            return res.status(400).json({ message: 'Loan ID and a valid amount are required' });
        }

        // Get loan + member details
        const [loan] = await db.query(`
            SELECT l.id, l.amount, l.interest_rate, l.status, u.full_name, u.phone
            FROM loans l
            JOIN members m ON l.member_id = m.id
            JOIN users u ON m.user_id = u.id
            WHERE l.id = ?
        `, [loan_id]);

        if (loan.length === 0) {
            return res.status(404).json({ message: 'Loan not found' });
        }

        if (loan[0].status !== 'approved') {
            return res.status(400).json({ message: 'Only approved loans can receive repayments' });
        }

        // Calculate total already repaid
        const [totalRepaidResult] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total FROM loan_repayments WHERE loan_id = ?`,
            [loan_id]
        );
        const totalPaid = parseFloat(totalRepaidResult[0].total);

        // Calculate total amount due (Principal + Interest)
        const principal = parseFloat(loan[0].amount);
        const interestRate = parseFloat(loan[0].interest_rate);
        const interest = (principal * interestRate) / 100;
        const totalDue = principal + interest;

        const remaining = totalDue - totalPaid;

        if (amount > remaining) {
            return res.status(400).json({ 
                message: `Repayment amount exceeds remaining balance. Remaining: ${remaining.toFixed(2)}` 
            });
        }

        // Record the repayment
        const [result] = await db.query(
            `INSERT INTO loan_repayments (loan_id, amount, date, recorded_by) 
             VALUES (?, ?, ?, ?)`,
            [loan_id, amount, date || new Date(), recorded_by]
        );

        const newTotalPaid = totalPaid + parseFloat(amount);

        // If fully paid, mark as repaid
        if (newTotalPaid >= totalDue) {
            await db.query(`UPDATE loans SET status = 'repaid' WHERE id = ?`, [loan_id]);
        }

        // Audit log
        await db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) 
             VALUES (?, 'RECORD_REPAYMENT', 'loan_repayments', ?, ?)`,
            [recorded_by, result.insertId, `Amount: ${amount}`]
        );

        // ===== AUTOMATIC SMS =====
        if (loan[0].phone) {
            const { sendSMS } = require('../utils/smsService');
            const message = `Dear ${loan[0].full_name}, your loan repayment of MWK ${amount} has been received. Remaining balance: MWK ${(totalDue - newTotalPaid).toFixed(2)}. - Manase VSLA`;
            await sendSMS(loan[0].phone, message, recorded_by);
        }

        res.status(201).json({ 
            message: 'Repayment recorded successfully', 
            repaymentId: result.insertId,
            totalPaid: newTotalPaid,
            totalDue: totalDue,
            remaining: totalDue - newTotalPaid
        });
    } catch (error) {
        res.status(500).json({ message: 'Error recording repayment', error: error.message });
    }
};
// Get all loans (with outstanding balance)
const getAllLoans = async (req, res) => {
    try {
        const [loans] = await db.query(`
            SELECT l.id, l.amount, l.interest_rate, l.status, l.due_date,
                   m.membership_number, u.full_name, u.phone,
                   COALESCE((SELECT SUM(amount) FROM loan_repayments WHERE loan_id = l.id), 0) as total_repaid
            FROM loans l
            JOIN members m ON l.member_id = m.id
            JOIN users u ON m.user_id = u.id
            ORDER BY l.id DESC
        `);

        // Calculate outstanding balance for each loan
        const loansWithBalance = loans.map(loan => {
            const principal = parseFloat(loan.amount);
            const interest = (principal * parseFloat(loan.interest_rate)) / 100;
            const totalDue = principal + interest;
            const totalRepaid = parseFloat(loan.total_repaid);
            const outstanding = totalDue - totalRepaid;

            return {
                ...loan,
                interest_amount: interest,
                total_due: totalDue,
                outstanding_balance: outstanding > 0 ? outstanding : 0
            };
        });

        res.json(loansWithBalance);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching loans', error: error.message });
    }
};

// Get loans of a specific member
const getMemberLoans = async (req, res) => {
    try {
        const [loans] = await db.query(`
            SELECT l.id, l.amount, l.interest_rate, l.status, l.due_date,
                   COALESCE((SELECT SUM(amount) FROM loan_repayments WHERE loan_id = l.id), 0) as total_repaid
            FROM loans l
            WHERE l.member_id = ?
            ORDER BY l.id DESC
        `, [req.params.memberId]);

        const loansWithBalance = loans.map(loan => {
            const principal = parseFloat(loan.amount);
            const interest = (principal * parseFloat(loan.interest_rate)) / 100;
            const totalDue = principal + interest;
            const totalRepaid = parseFloat(loan.total_repaid);

            return {
                ...loan,
                interest_amount: interest,
                total_due: totalDue,
                outstanding_balance: totalDue - totalRepaid > 0 ? totalDue - totalRepaid : 0
            };
        });

        res.json(loansWithBalance);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching member loans', error: error.message });
    }
};

// Get outstanding loans summary
const getOutstandingLoans = async (req, res) => {
    try {
        const [loans] = await db.query(`
            SELECT l.id, l.amount, l.interest_rate,
                   COALESCE((SELECT SUM(amount) FROM loan_repayments WHERE loan_id = l.id), 0) as total_repaid
            FROM loans l
            WHERE l.status = 'approved'
        `);

        let totalOutstanding = 0;
        let count = 0;

        loans.forEach(loan => {
            const principal = parseFloat(loan.amount);
            const interest = (principal * parseFloat(loan.interest_rate)) / 100;
            const outstanding = (principal + interest) - parseFloat(loan.total_repaid);
            if (outstanding > 0) {
                totalOutstanding += outstanding;
                count++;
            }
        });

        res.json({
            total_outstanding_loans: count,
            total_outstanding_amount: totalOutstanding
        });
    } catch (error) {
        res.status(500).json({ message: 'Error calculating outstanding loans', error: error.message });
    }
};

// Get repayment history of a specific loan
const getLoanRepayments = async (req, res) => {
    try {
        const [repayments] = await db.query(`
            SELECT id, amount, date, recorded_by
            FROM loan_repayments
            WHERE loan_id = ?
            ORDER BY date ASC
        `, [req.params.id]);

        res.json(repayments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching repayments', error: error.message });
    }
};

// Get full loan statement
const getLoanStatement = async (req, res) => {
    try {
        // Get loan details
        const [loans] = await db.query(`
            SELECT l.id, l.amount, l.interest_rate, l.status, l.due_date,
                   m.membership_number, u.full_name, u.phone
            FROM loans l
            JOIN members m ON l.member_id = m.id
            JOIN users u ON m.user_id = u.id
            WHERE l.id = ?
        `, [req.params.id]);

        if (loans.length === 0) {
            return res.status(404).json({ message: 'Loan not found' });
        }

        const loan = loans[0];
        const principal = parseFloat(loan.amount);
        const interest = (principal * parseFloat(loan.interest_rate)) / 100;
        const totalDue = principal + interest;

        // Get all repayments
        const [repayments] = await db.query(`
            SELECT id, amount, date
            FROM loan_repayments
            WHERE loan_id = ?
            ORDER BY date ASC
        `, [req.params.id]);

        const totalRepaid = repayments.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        const outstanding = totalDue - totalRepaid;

        res.json({
            loan: {
                ...loan,
                interest_amount: interest,
                total_due: totalDue,
                total_repaid: totalRepaid,
                outstanding_balance: outstanding > 0 ? outstanding : 0
            },
            repayments: repayments
        });
    } catch (error) {
        res.status(500).json({ message: 'Error generating loan statement', error: error.message });
    }
};

module.exports = {
    applyLoan,
    updateLoanStatus,
    recordRepayment,
    getAllLoans,
    getMemberLoans,
    getOutstandingLoans,
    getLoanRepayments,
    getLoanStatement
};