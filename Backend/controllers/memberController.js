const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all members
const getAllMembers = async (req, res) => {
    try {
        const [members] = await db.query(`
            SELECT m.id, m.membership_number, m.date_joined, m.status, 
                   u.full_name, u.phone, u.role 
            FROM members m 
            LEFT JOIN users u ON m.user_id = u.id
            ORDER BY m.id ASC
        `);
        res.json(members);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching members', error: error.message });
    }
};

// Get single member by ID
const getMemberById = async (req, res) => {
    try {
        const [member] = await db.query(`
            SELECT m.*, u.full_name, u.phone, u.role 
            FROM members m 
            LEFT JOIN users u ON m.user_id = u.id 
            WHERE m.id = ?
        `, [req.params.id]);
        
        if (member.length === 0) {
            return res.status(404).json({ message: 'Member not found' });
        }
        res.json(member[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching member', error: error.message });
    }
};

// Create new member
const createMember = async (req, res) => {
    const { membership_number, date_joined, full_name, phone, role = 'member' } = req.body;

    try {
        // Create user first
        const hashedPassword = await bcrypt.hash('default123', 10);

        const [userResult] = await db.query(
            'INSERT INTO users (username, password, role, full_name, phone) VALUES (?, ?, ?, ?, ?)',
            [membership_number, hashedPassword, role, full_name, phone]
        );

        // Create member
        const [memberResult] = await db.query(
            'INSERT INTO members (user_id, membership_number, date_joined) VALUES (?, ?, ?)',
            [userResult.insertId, membership_number, date_joined || new Date()]
        );

        res.status(201).json({ 
            message: 'Member created successfully', 
            memberId: memberResult.insertId 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating member', error: error.message });
    }
};


// Update member
const updateMember = async (req, res) => {
    const { full_name, phone, status, date_joined, role } = req.body;
    const memberId = req.params.id;

    try {
        // Update the linked user (including role)
        await db.query(
            `UPDATE users u 
             JOIN members m ON u.id = m.user_id 
             SET u.full_name = ?, u.phone = ?, u.role = COALESCE(?, u.role)
             WHERE m.id = ?`,
            [full_name, phone, role, memberId]
        );

        // Update the member record
        await db.query(
            `UPDATE members 
             SET status = ?, date_joined = ? 
             WHERE id = ?`,
            [status || 'active', date_joined, memberId]
        );

        res.json({ message: 'Member updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating member', error: error.message });
    }
};
// Delete member (soft delete)
const deleteMember = async (req, res) => {
    const memberId = req.params.id;

    try {
        await db.query(
            `UPDATE members SET status = 'inactive' WHERE id = ?`,
            [memberId]
        );

        res.json({ message: 'Member deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting member', error: error.message });
    }
};

module.exports = { 
    getAllMembers, 
    getMemberById, 
    createMember, 
    updateMember, 
    deleteMember 
};