require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { publicImpact } = require('./controllers/dashboardController');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL;

app.set('trust proxy', 1);
app.use(cors({ origin: FRONTEND_URL || true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/members', require('./routes/memberRoutes'));
app.use('/api/savings', require('./routes/savingsRoutes'));
app.use('/api/loans', require('./routes/loanRoutes'));
app.use('/api/fines', require('./routes/fineRoutes'));
app.use('/api/welfare', require('./routes/welfareRoutes'));
app.use('/api/meetings', require('./routes/meetingRoutes'));
app.use('/api/cycles', require('./routes/cycleRoutes'));
app.use('/api/shareout', require('./routes/shareOutRoutes'));
app.use('/api/join-requests', require('./routes/joinRequestRoutes'));
app.use('/api/sms', require('./routes/smsRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Counts only, no money — this is what the public front page shows.
app.get('/api/public/impact', publicImpact);

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      ok: true,
      database: 'connected',
      sms: process.env.TEXTBEE_API_KEY ? 'configured' : 'not configured',
      dry_run: String(process.env.SMS_DRY_RUN).toLowerCase() === 'true',
    });
  } catch (err) {
    res.status(503).json({ ok: false, database: 'not connected', error: err.message });
  }
});

app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`\n  Village Bank API on http://localhost:${PORT}`);
  console.log(`  Frontend expected at ${FRONTEND_URL || 'any origin'}`);
  console.log(`  Health check: http://localhost:${PORT}/api/health\n`);
});

const shutdown = (signal) => {
  console.log(`\n${signal} received, closing.`);
  server.close(() => pool.end().then(() => process.exit(0)));
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
