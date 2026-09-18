import './EmptyState.css';

/** An empty screen is an invitation to do the thing, not an apology. */
export default function EmptyState({ title, body, action }) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {body && <p className="empty__body">{body}</p>}
      {action}
    </div>
  );
}
