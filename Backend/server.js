const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/db');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const savingsRoutes = require('./routes/savingsRoutes');
const loanRoutes = require('./routes/loanRoutes');
const welfareRoutes = require('./routes/welfareRoutes');
const shareOutRoutes = require('./routes/shareOutRoutes');
const fineRoutes = require('./routes/fineRoutes');
const cycleRoutes = require('./routes/cycleRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const reportRoutes = require('./routes/reportRoutes');
const smsRoutes = require('./routes/smsRoutes');
const auditRoutes = require('./routes/auditRoutes');
const joinRequestRoutes = require('./routes/joinRequestRoutes');
const profileRoutes = require('./routes/profileRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend website (do not auto-open index.html)
app.use(express.static(path.join(__dirname, '../Frontend'), { index: false }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/welfare', welfareRoutes);
app.use('/api/shareout', shareOutRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/join-requests', joinRequestRoutes);
app.use('/api/profile', profileRoutes);

// Public impact stats for home page
// Shows rates/counts only — NO fund/money amounts
app.get('/api/public/impact', async (req, res) => {
    try {
        const [members] = await db.query(
            `SELECT COUNT(*) AS total FROM members WHERE status = 'active'`
        );

        const [loanStats] = await db.query(`
            SELECT
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN status = 'repaid' THEN 1 ELSE 0 END) AS repaid,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
                COUNT(*) AS total
            FROM loans
        `);

        const pending = Number(loanStats[0].pending || 0);
        const approved = Number(loanStats[0].approved || 0);
        const repaid = Number(loanStats[0].repaid || 0);
        const rejected = Number(loanStats[0].rejected || 0);
        const totalLoans = Number(loanStats[0].total || 0);

        // Recovery rate from loan counts (not money)
        const completed = approved + repaid;
        const recoveryRate = completed > 0 ? Math.round((repaid / completed) * 100) : 0;

        // Group health score (0–100), no fund values
        const activeMembers = Number(members[0].total || 0);
        let health = 50;
        if (activeMembers >= 5) health += 15;
        if (activeMembers >= 10) health += 10;
        if (recoveryRate >= 50) health += 15;
        if (recoveryRate >= 80) health += 10;
        if (totalLoans > 0) health += 5;
        if (health > 100) health = 100;

        res.json({
            active_members: activeMembers,
            pending,
            approved,
            repaid,
            rejected,
            recovery_rate: recoveryRate,
            group_health: health
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error loading impact stats',
            error: error.message
        });
    }
});

// Website homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/home.html'));
});

// Test DB
app.get('/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 as connection_test');
        res.json({ message: '✅ Database Connected Successfully!', data: rows });
    } catch (error) {
        res.status(500).json({ message: '❌ Database Connection Failed', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});