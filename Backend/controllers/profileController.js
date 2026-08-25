const db = require('../config/db');
const path = require('path');
const fs = require('fs');

// Get logged-in member's full profile
const getMyProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get member linked to this user
        const [members] = await db.query(`
            SELECT m.id, m.membership_number, m.date_joined, m.status,
                   u.full_name, u.phone, u.username, u.role
            FROM members m
            JOIN users u ON m.user_id = u.id
            WHERE m.user_id = ?
        `, [userId]);

        if (members.length === 0) {
            return res.status(404).json({ message: 'No member profile found for this account' });
        }

        const member = members[0];
        const memberId = member.id;

        // Savings
        const [savings] = await db.query(`
            SELECT id, amount, date
            FROM savings
            WHERE member_id = ?
            ORDER BY date DESC
        `, [memberId]);

        const totalSavings = savings.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);

        // Loans
        const [loans] = await db.query(`
            SELECT l.id, l.amount, l.interest_rate, l.status, l.due_date,
                   COALESCE((SELECT SUM(amount) FROM loan_repayments WHERE loan_id = l.id), 0) AS total_repaid
            FROM loans l
            WHERE l.member_id = ?
            ORDER BY l.id DESC
        `, [memberId]);

        const loansWithBalance = loans.map(l => {
            const principal = parseFloat(l.amount || 0);
            const interest = principal * (parseFloat(l.interest_rate || 0) / 100);
            const totalDue = principal + interest;
            const totalRepaid = parseFloat(l.total_repaid || 0);
            const outstanding = Math.max(totalDue - totalRepaid, 0);
            return {
                ...l,
                total_due: totalDue,
                outstanding_balance: outstanding
            };
        });

        // Fines
        const [fines] = await db.query(`
            SELECT id, amount, reason, date
            FROM fines
            WHERE member_id = ?
            ORDER BY date DESC
        `, [memberId]);

        const totalFines = fines.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);

        // Documents
        const [documents] = await db.query(`
            SELECT id, document_type, file_name, original_name, uploaded_at
            FROM member_documents
            WHERE member_id = ?
            ORDER BY uploaded_at DESC
        `, [memberId]);

        res.json({
            member,
            total_savings: totalSavings,
            savings,
            loans: loansWithBalance,
            total_fines: totalFines,
            fines,
            documents
        });
    } catch (error) {
        res.status(500).json({ message: 'Error loading profile', error: error.message });
    }
};

// Update own phone number
const updateMyPhone = async (req, res) => {
    try {
        const userId = req.user.id;
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        await db.query(`UPDATE users SET phone = ? WHERE id = ?`, [phone, userId]);
        res.json({ message: 'Phone number updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating phone', error: error.message });
    }
};

// Upload document
const uploadDocument = async (req, res) => {
    try {
        const userId = req.user.id;
        const { document_type } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        if (!document_type) {
            return res.status(400).json({ message: 'Document type is required' });
        }

        const [members] = await db.query(
            `SELECT id FROM members WHERE user_id = ?`,
            [userId]
        );

        if (members.length === 0) {
            return res.status(404).json({ message: 'Member profile not found' });
        }

        const memberId = members[0].id;

        const [result] = await db.query(`
            INSERT INTO member_documents (member_id, document_type, file_name, original_name, uploaded_by)
            VALUES (?, ?, ?, ?, ?)
        `, [memberId, document_type, req.file.filename, req.file.originalname, userId]);

        res.status(201).json({
            message: 'Document uploaded successfully',
            documentId: result.insertId,
            file_name: req.file.filename
        });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading document', error: error.message });
    }
};

// Delete own document
const deleteDocument = async (req, res) => {
    try {
        const userId = req.user.id;
        const documentId = req.params.id;

        const [docs] = await db.query(`
            SELECT d.id, d.file_name, d.member_id
            FROM member_documents d
            JOIN members m ON d.member_id = m.id
            WHERE d.id = ? AND m.user_id = ?
        `, [documentId, userId]);

        if (docs.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const filePath = path.join(__dirname, '..', 'uploads', 'documents', docs[0].file_name);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await db.query(`DELETE FROM member_documents WHERE id = ?`, [documentId]);

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting document', error: error.message });
    }
};

module.exports = {
    getMyProfile,
    updateMyPhone,
    uploadDocument,
    deleteDocument
};