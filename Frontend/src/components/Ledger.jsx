import { useLang } from '../context/LangContext.jsx';
import EmptyState from './EmptyState.jsx';
import './Ledger.css';

/**
 * The ruled table the whole app reads from.
 *
 * columns: [{ key, label, align, render, money, hideOnPhone }]
 * On a narrow screen each row folds into its own block with the column
 * label beside each value, because a 7-column table is unusable on a phone.
 */
export default function Ledger({ columns, rows, keyField = 'id', empty, onRowClick, caption }) {
  const { t } = useLang();

  if (!rows || rows.length === 0) {
    return empty || <EmptyState title={t('common.none')} />;
  }

  return (
    <div className="ledger-wrap">
      <table className="ledger">
        {caption && <caption className="ledger__caption">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={[
                  c.align === 'right' ? 'is-right' : '',
                  c.hideOnPhone ? 'is-wide-only' : '',
                ].join(' ').trim()}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row[keyField] ?? i}
              className={onRowClick ? 'is-clickable' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  data-label={c.label}
                  className={[
                    c.align === 'right' ? 'is-right' : '',
                    c.money ? 'money' : '',
                    c.hideOnPhone ? 'is-wide-only' : '',
                  ].join(' ').trim()}
                >
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
