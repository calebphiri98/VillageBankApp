const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/db');


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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
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


// Test Routes
app.get('/', (req, res) => {
    res.send('✅ VSLA Manase Backend is Running!');
});

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