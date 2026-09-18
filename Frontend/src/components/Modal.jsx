import { useEffect, useRef } from 'react';
import { useLang } from '../context/LangContext.jsx';
import './Modal.css';

/** A sheet that slides up from the bottom on a phone, centres on a laptop. */
export default function Modal({ open, title, onClose, children, footer, wide = false }) {
  const { t } = useLang();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="modal__scrim" onClick={onClose} aria-label={t('common.close')} />
      <div className={wide ? 'modal__panel modal__panel--wide' : 'modal__panel'} ref={panelRef} tabIndex={-1}>
        <header className="modal__head">
          <h2 className="modal__title">{title}</h2>
          <button type="button" className="modal__x" onClick={onClose} aria-label={t('common.close')}>&times;</button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}
