const CURRENCY = 'MWK';

/** MWK 12,500.00 — always two decimals so columns line up. */
export function money(value, { compact = false } = {}) {
  const n = Number(value || 0);
  if (compact && Math.abs(n) >= 1000000) return `${CURRENCY} ${(n / 1000000).toFixed(1)}M`;
  if (compact && Math.abs(n) >= 10000) return `${CURRENCY} ${Math.round(n / 1000)}k`;
  return `${CURRENCY} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function plainNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

export function shortDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function dateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Value for an <input type="date">. */
export function inputDate(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function initials(name) {
  return String(name || '?')
    .split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase();
}

/** Turn RECORD_SAVING into "Record saving" for the activity log. */
export function humanAction(action) {
  return String(action || '')
    .toLowerCase().replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}
