// Fills the database with a starting cycle, settings and demo people.
// Run:  npm run db:seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const DEFAULT_SETTINGS = [
  ['loan_multiplier', '3'],
  ['default_interest_rate', '10'],
  // Interest stays in the box by default, because a member may choose to
  // borrow without interest at all — so it is not shared out.
  ['include_interest_in_shareout', 'no'],
  ['include_fines_in_shareout', 'yes'],
  ['include_welfare_in_shareout', 'no'],
  ['weekly_share_value', '1000'],
  ['welfare_contribution', '200'],
];

// Demo people. Change the phone numbers to real ones to test SMS.
const PEOPLE = [
  { username: 'admin',    name: 'Grace Mwale',   role: 'admin',     phone: '0991000001', lang: 'en', pass: 'admin123' },
  { username: 'treasurer', name: 'Esnart Banda', role: 'treasurer', phone: '0991000002', lang: 'ny', pass: 'treasurer123' },
  { username: 'secretary', name: 'Loveness Phiri', role: 'secretary', phone: '0991000003', lang: 'ny', pass: 'secretary123' },
  { username: 'agnesb',   name: 'Agnes Banda',   role: 'member',    phone: '0991000004', lang: 'ny', pass: 'member123' },
  { username: 'maryk',    name: 'Mary Kachala',  role: 'member',    phone: '0991000005', lang: 'ny', pass: 'member123' },
  { username: 'ellenm',   name: 'Ellen Mbewe',   role: 'member',    phone: '0991000006', lang: 'ny', pass: 'member123' },
  { username: 'tionges',  name: 'Tionge Sakala', role: 'member',    phone: '0991000007', lang: 'en', pass: 'member123' },
];

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const [key, value] of DEFAULT_SETTINGS) {
      await client.query(
        `INSERT INTO settings (setting_key, setting_value) VALUES ($1,$2)
         ON CONFLICT (setting_key) DO NOTHING`,
        [key, value]
      );
    }

    // A saving period is one year.
    const start = new Date();
    start.setMonth(0, 1);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);

    let cycle = (await client.query(`SELECT * FROM cycles WHERE status = 'active' LIMIT 1`)).rows[0];
    if (!cycle) {
      cycle = (await client.query(
        `INSERT INTO cycles (cycle_name, start_date, end_date, share_value)
         VALUES ($1,$2,$3,1000) RETURNING *`,
        [`Cycle ${start.getFullYear()}`, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
      )).rows[0];
      console.log(`Created cycle: ${cycle.cycle_name}`);
    }

    let n = 0;
    const created = [];
    for (const p of PEOPLE) {
      const exists = (await client.query(`SELECT id FROM users WHERE username = $1`, [p.username])).rows[0];
      if (exists) continue;

      const hashed = await bcrypt.hash(p.pass, 10);
      const user = (await client.query(
        `INSERT INTO users (username, password, role, full_name, phone, language)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [p.username, hashed, p.role, p.name, p.phone, p.lang]
      )).rows[0];

      n += 1;
      await client.query(
        `INSERT INTO members (user_id, membership_number, village) VALUES ($1,$2,$3)`,
        [user.id, `VB-${String(n).padStart(4, '0')}`, 'Manase']
      );
      created.push(p);
    }

    // A few weeks of savings so the dashboards are not empty.
    const members = (await client.query(
      `SELECT m.id FROM members m JOIN users u ON u.id = m.user_id ORDER BY m.id`
    )).rows;
    const admin = (await client.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`)).rows[0];
    const hasSavings = (await client.query(`SELECT COUNT(*)::int AS c FROM savings`)).rows[0].c > 0;

    if (!hasSavings && admin && members.length) {
      for (let week = 0; week < 6; week++) {
        const date = new Date(Date.now() - (5 - week) * 7 * 86400000).toISOString().slice(0, 10);
        for (const m of members) {
          await client.query(
            `INSERT INTO savings (member_id, cycle_id, amount, shares, date, recorded_by)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [m.id, cycle.id, 1000 * (1 + (m.id % 3)), 1 + (m.id % 3), date, admin.id]
          );
        }
        await client.query(
          `INSERT INTO welfare_fund (cycle_id, amount, type, date, notes, recorded_by)
           VALUES ($1,$2,'contribution',$3,'Weekly welfare collection',$4)`,
          [cycle.id, 200 * members.length, date, admin.id]
        );
      }
      console.log('Added 6 weeks of demo savings and welfare.');
    }

    await client.query('COMMIT');

    console.log('\nSeed complete. You can log in with:\n');
    for (const p of (created.length ? created : PEOPLE)) {
      console.log(`  ${p.role.padEnd(10)} ${p.username.padEnd(11)} ${p.pass}`);
    }
    console.log('\nChange these passwords before anyone uses this for real money.\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nSeed failed:', err.message);
    if (err.code === '42P01') console.error('Tables are missing. Run: npm run db:setup\n');
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
