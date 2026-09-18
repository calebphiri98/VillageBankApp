import './StatCard.css';

/**
 * One figure with its label. `tone` tints the rule above the number:
 * gold for money, red for something that needs attention.
 */
export default function StatCard({ label, value, hint, tone = 'plain', big = false, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`stat stat--${tone}${onClick ? ' stat--clickable' : ''}`}
      onClick={onClick}
    >
      <span className="stat__label">{label}</span>
      <span className={big ? 'stat__value stat__value--big money' : 'stat__value money'}>{value}</span>
      {hint && <span className="stat__hint">{hint}</span>}
    </Tag>
  );
}
