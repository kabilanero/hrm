import { ReactNode, useEffect } from 'react';
import type { PageMeta } from '@/api/types';

/* ───────── layout bits ───────── */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" />
      <span className="muted">{label}</span>
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  const msg = error instanceof Error ? ('full' in error ? String((error as { full: string }).full) : error.message) : String(error);
  return (
    <div className="alert alert-error" role="alert">
      {msg}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {hint && <p className="muted">{hint}</p>}
    </div>
  );
}

const TONE: Record<string, string> = {
  PENDING: 'amber', APPROVED: 'green', REJECTED: 'red', REVOKED: 'gray', CANCELLED: 'gray',
  PRESENT: 'green', ABSENT: 'red', HALF_DAY: 'amber', ON_LEAVE: 'blue', HOLIDAY: 'violet', WEEK_OFF: 'gray',
  ACTIVE: 'green', INACTIVE: 'gray', ADMIN: 'violet', HR: 'blue', MANAGER: 'amber', EMPLOYEE: 'gray',
};
export function Badge({ value, tone }: { value: string; tone?: string }) {
  return <span className={`badge badge-${tone ?? TONE[value] ?? 'gray'}`}>{value.replace(/_/g, ' ')}</span>;
}

/* ───────── modal ───────── */
export function Modal({
  title, onClose, children, footer, size = 'md',
}: { title: string; onClose(): void; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ───────── form fields ───────── */
interface FieldBase { label: string; error?: string; hint?: string; required?: boolean }
type InputProps = FieldBase & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & { value: string | number; onChange(v: string): void };
export function Input({ label, error, hint, required, onChange, ...rest }: InputProps) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span>{label}{required && <b className="req"> *</b>}</span>
      <input {...rest} required={required} onChange={(e) => onChange(e.target.value)} />
      {hint && !error && <small className="muted">{hint}</small>}
      {error && <small className="err">{error}</small>}
    </label>
  );
}

export function Textarea({ label, value, onChange, required, rows = 3 }: FieldBase & { value: string; onChange(v: string): void; rows?: number }) {
  return (
    <label className="field">
      <span>{label}{required && <b className="req"> *</b>}</span>
      <textarea rows={rows} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export interface Option { value: string; label: string }
export function Select({
  label, value, onChange, options, placeholder = 'Select…', required, hint, disabled, name,
}: FieldBase & { value: string; onChange(v: string): void; options: Option[]; placeholder?: string; disabled?: boolean; name?: string }) {
  return (
    <label className="field">
      <span>{label}{required && <b className="req"> *</b>}</span>
      <select name={name} value={value} required={required} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange(v: boolean): void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/* ───────── table + pagination ───────── */
export interface Column<T> {
  key: string;
  header: string;
  render(row: T): ReactNode;
  sortKey?: string;
  align?: 'right' | 'center';
  width?: string;
}

export function DataTable<T extends { id?: string }>({
  columns, rows, loading, sort, onSort, empty = 'No records found', rowKey, testId,
}: {
  columns: Column<T>[]; rows: T[] | undefined; loading?: boolean; sort?: string; onSort?(s: string): void;
  empty?: string; rowKey?(r: T, i: number): string; testId?: string;
}) {
  const [field, dir] = (sort ?? '').split(':');
  return (
    <div className="table-wrap">
      <table className="table" data-testid={testId}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width, textAlign: c.align }}>
                {c.sortKey && onSort ? (
                  <button className="th-sort" onClick={() => onSort(`${c.sortKey}:${field === c.sortKey && dir !== 'desc' ? 'desc' : 'asc'}`)}>
                    {c.header}
                    <i>{field === c.sortKey ? (dir === 'desc' ? '▼' : '▲') : ''}</i>
                  </button>
                ) : (
                  c.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && !rows ? (
            <tr><td colSpan={columns.length}><Spinner /></td></tr>
          ) : rows && rows.length ? (
            rows.map((r, i) => (
              <tr key={rowKey ? rowKey(r, i) : (r.id ?? i)}>
                {columns.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align }}>{c.render(r)}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr><td colSpan={columns.length}><Empty title={empty} /></td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ meta, onPage, onSize }: { meta?: PageMeta; onPage(p: number): void; onSize?(s: number): void }) {
  if (!meta) return null;
  const from = meta.totalItems === 0 ? 0 : (meta.page - 1) * meta.size + 1;
  const to = Math.min(meta.page * meta.size, meta.totalItems);
  return (
    <div className="pagination">
      <span className="muted">{from}–{to} of {meta.totalItems}</span>
      <div className="pager">
        {onSize && (
          <select value={meta.size} onChange={(e) => onSize(Number(e.target.value))} aria-label="Rows per page">
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        )}
        <button className="btn btn-sm" disabled={!meta.hasPrevious} onClick={() => onPage(meta.page - 1)}>‹ Prev</button>
        <span className="muted">Page {meta.page} / {meta.totalPages}</span>
        <button className="btn btn-sm" disabled={!meta.hasNext} onClick={() => onPage(meta.page + 1)}>Next ›</button>
      </div>
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="toolbar">{children}</div>;
}
