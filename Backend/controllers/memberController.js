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

// Create new member with proper username + temporary password
const createMember = async (req, res) => {
    const { membership_number, date_joined, full_name, phone, role = 'member' } = req.body;

    try {
        if (!membership_number || !full_name || !phone) {
            return res.status(400).json({
                message: 'Membership number, full name, and phone are required'
            });
        }

        // Generate username from full name: "Grace Banda" -> "grace.banda"
        let baseUsername = full_name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '.');

        if (!baseUsername) {
            baseUsername = 'member' + Date.now();
        }

        // Ensure username is unique
        let username = baseUsername;
        let counter = 2;
        while (true) {
            const [existing] = await db.query(
                'SELECT id FROM users WHERE username = ?',
                [username]
            );
            if (existing.length === 0) break;
            username = `${baseUsername}${counter}`;
            counter++;
        }

        // Temporary password
        const tempPassword = 'Manase@123';
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create user account
        const [userResult] = await db.query(
            `INSERT INTO users (username, password, role, full_name, phone)
             VALUES (?, ?, ?, ?, ?)`,
            [username, hashedPassword, role, full_name, phone]
        );

        // Create member record
        const [memberResult] = await db.query(
            `INSERT INTO members (user_id, membership_number, date_joined, status)
             VALUES (?, ?, ?, 'active')`,
            [userResult.insertId, membership_number, date_joined || new Date()]
        );

        // Simulate / attempt SMS with login details
        try {
            const { sendSMS } = require('../utils/smsService');
            const smsMessage =
                `Welcome to Manase VSLA.\n` +
                `Username: ${username}\n` +
                `Temporary Password: ${tempPassword}\n` +
                `Please login and change your password.\n` +
                `- Manase VSLA`;

            await sendSMS(phone, smsMessage);
        } catch (smsError) {
            console.error('SMS send failed (member still created):', smsError.message);
        }

        res.status(201).json({
            message: 'Member created successfully',
            memberId: memberResult.insertId,
            username,
            temporaryPassword: tempPassword,
            note: 'Share these login details with the member. SMS also logged/simulated.'
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
        await db.query(
            `UPDATE users u 
             JOIN members m ON u.id = m.user_id 
             SET u.full_name = ?, u.phone = ?, u.role = COALESCE(?, u.role)
             WHERE m.id = ?`,
            [full_name, phone, role, memberId]
        );

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

// Delete member (soft delete / deactivate)
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