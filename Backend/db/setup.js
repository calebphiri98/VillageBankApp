// Creates every table in your Neon database.  Run:  npm run db:setup
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

(async () => {
  const force = process.argv.includes('--force');

  try {
    if (force) {
      console.log('Dropping existing tables...');
      await pool.query(`
        DROP TABLE IF EXISTS share_out_details, share_out, join_request_votes, join_requests,
          attendance, meetings, welfare_fund, fines, loan_repayments, loans, savings,
          password_resets, sms_notifications, audit_logs, settings, members, cycles, users CASCADE;
      `);
    }

    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(sql);

    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' ORDER BY table_name`
    );
    console.log(`\nDatabase ready. ${rows.length} tables:`);
    console.log(rows.map((r) => '  - ' + r.table_name).join('\n'));
    console.log('\nNow run:  npm run db:seed\n');
  } catch (err) {
    console.error('\nSetup failed:', err.message);
    if (err.message.includes('DATABASE_URL') || err.code === 'ENOTFOUND') {
      console.error('Check DATABASE_URL in backend/.env — it should be your Neon connection string.\n');
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
