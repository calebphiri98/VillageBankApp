const jwt = require('jsonwebtoken');
const { one } = require('../config/db');

/** Require a valid, unexpired token. */
async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Please log in to continue.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await one(
      `SELECT u.id, u.username, u.role, u.full_name, u.phone, u.language, u.is_active,
              u.must_change_password, m.id AS member_id
         FROM users u
         LEFT JOIN members m ON m.user_id = u.id
        WHERE u.id = $1`,
      [decoded.id]
    );

    if (!user) return res.status(401).json({ message: 'This account no longer exists.' });
    if (!user.is_active) return res.status(403).json({ message: 'This account has been suspended.' });

    req.user = user;
    next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      message: expired ? 'Your session has ended. Please log in again.' : 'Your session is not valid.',
      expired,
    });
  }
}

/** Restrict a route to certain roles. */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Please log in to continue.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Your role cannot do this.' });
    }
    next();
  };
}

/** Anyone who keeps the books: admin, treasurer or secretary. */
const committee = () => authorize('admin', 'treasurer', 'secretary');

module.exports = { protect, authorize, committee };
