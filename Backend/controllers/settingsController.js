const { query } = require('../config/db');
const { wrap } = require('../middleware/errorHandler');
const { setSetting } = require('../utils/helpers');
const { audit } = require('../utils/audit');

const EDITABLE = {
  loan_multiplier: 'How many times her savings a member may borrow',
  default_interest_rate: 'Interest rate offered on loans (%)',
  include_interest_in_shareout: 'Share loan interest at share-out (yes/no)',
  include_fines_in_shareout: 'Share fine money at share-out (yes/no)',
  include_welfare_in_shareout: 'Share what is left of the welfare fund (yes/no)',
  weekly_share_value: 'Value of one share',
  welfare_contribution: 'Welfare contribution per meeting',
};

// GET /api/settings
const listSettings = wrap(async (req, res) => {
  const rows = await query(`SELECT setting_key, setting_value, updated_at FROM settings ORDER BY setting_key`);
  res.json(rows.map((r) => ({ ...r, label: EDITABLE[r.setting_key] || r.setting_key })));
});

// PUT /api/settings
const updateSettings = wrap(async (req, res) => {
  const updates = req.body && typeof req.body === 'object' ? req.body : {};
  const keys = Object.keys(updates).filter((k) => k in EDITABLE);

  if (!keys.length) return res.status(400).json({ message: 'Nothing to change.' });

  for (const key of keys) {
    let value = String(updates[key]).trim();
    if (key.startsWith('include_')) value = ['yes', 'true', '1'].includes(value.toLowerCase()) ? 'yes' : 'no';
    if (['loan_multiplier', 'default_interest_rate', 'weekly_share_value', 'welfare_contribution'].includes(key)) {
      if (Number.isNaN(Number(value)) || Number(value) < 0) {
        return res.status(400).json({ message: `${EDITABLE[key]} must be a number.` });
      }
    }
    await setSetting(key, value);
  }

  await audit(req.user.id, 'UPDATE_SETTINGS', 'settings', null, keys.join(', '));
  res.json({ message: 'Settings saved.', updated: keys });
});

module.exports = { listSettings, updateSettings };
