const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const register = async (req, res) => {
    const { username, password, role, full_name, phone } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await db.query(
            'INSERT INTO users (username, password, role, full_name, phone) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, role, full_name, phone]
        );

        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};

const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ 
            message: 'Login successful', 
            token,
            user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Forgot Password - reset using username + phone
const forgotPassword = async (req, res) => {
    const { username, phone, new_password } = req.body;

    try {
        if (!username || !phone || !new_password) {
            return res.status(400).json({
                message: 'Username, phone number, and new password are required'
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters'
            });
        }

        const [users] = await db.query(
            `SELECT id FROM users WHERE username = ? AND phone = ?`,
            [username, phone]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: 'No account found with that username and phone number'
            });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);

        await db.query(
            `UPDATE users SET password = ? WHERE id = ?`,
            [hashedPassword, users[0].id]
        );

        res.json({ message: 'Password reset successfully. You can now login.' });
    } catch (error) {
        res.status(500).json({
            message: 'Error resetting password',
            error: error.message
        });
    }
};

// Change password (logged-in user)
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                message: 'Current password and new password are required'
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                message: 'New password must be at least 6 characters'
            });
        }

        const [users] = await db.query(
            'SELECT id, password FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(current_password, users[0].password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({
            message: 'Error changing password',
            error: error.message
        });
    }
};

module.exports = {
    register,
    login,
    forgotPassword,
    changePassword
};