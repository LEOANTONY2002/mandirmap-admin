import { ReactNode } from 'react';

export function EntityTable<T>({
  rows,
  columns,
  onSelect,
  getKey,
  actions,
}: {
  rows: T[];
  columns: Array<{ label: string; render: (row: T) => ReactNode }>;
  onSelect?: (row: T) => void;
  getKey: (row: T) => string | number;
  actions?: (row: T) => ReactNode;
}) {
  return (
    <div className="table-card">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.label}>{column.label}</th>
            ))}
            {actions ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getKey(row)}
              onClick={() => onSelect?.(row)}
              className={onSelect ? 'clickable-row' : ''}
            >
              {columns.map((column) => (
                <td key={column.label}>{column.render(row)}</td>
              ))}
              {actions ? <td onClick={(e) => e.stopPropagation()}>{actions(row)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
