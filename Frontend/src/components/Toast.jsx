import './Toast.css';

/** Messages that slide in at the bottom on a phone, top-right on a laptop. */
export default function Toast({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          <p className="toast__text">{t.message}</p>
          <button type="button" className="toast__close" onClick={() => onDismiss(t.id)} aria-label="Close">
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
