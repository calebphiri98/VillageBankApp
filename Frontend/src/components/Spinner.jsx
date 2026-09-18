import { useLang } from '../context/LangContext.jsx';
import './Spinner.css';

export default function Spinner({ label, inline = false }) {
  const { t } = useLang();
  return (
    <div className={inline ? 'spinner spinner--inline' : 'spinner'} role="status">
      <span className="spinner__ring" aria-hidden="true" />
      <span className={inline ? 'visually-hidden' : 'spinner__label'}>{label || t('common.loading')}</span>
    </div>
  );
}
