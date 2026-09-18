function notFound(req, res) {
  res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[error]', err.message);

  if (err.code === '23505') {
    return res.status(409).json({ message: 'That record already exists.', detail: err.detail });
  }
  if (err.code === '23503') {
    return res.status(400).json({ message: 'That record is linked to something else and cannot be changed.' });
  }
  if (err.code === '42P01') {
    return res.status(500).json({ message: 'The database tables are missing. Run: npm run db:setup' });
  }

  res.status(err.status || 500).json({
    message: err.expose ? err.message : 'Something went wrong on the server.',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
}

/** Wrap async controllers so rejected promises reach the error handler. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { notFound, errorHandler, wrap };
