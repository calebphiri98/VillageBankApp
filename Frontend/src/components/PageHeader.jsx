import './PageHeader.css';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <header className="pagehead">
      <div className="pagehead__text">
        <h1 className="pagehead__title">{title}</h1>
        {subtitle && <p className="pagehead__sub">{subtitle}</p>}
      </div>
      {action && <div className="pagehead__action">{action}</div>}
    </header>
  );
}
