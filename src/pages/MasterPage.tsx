import { useQuery } from '@tanstack/react-query';
import { FormEvent, ReactNode, useState } from 'react';
import {
  bloodGroupsApi, branchesApi, departmentsApi, designationsApi, holidaysApi, leaveTypesApi, workShiftsApi,
} from '@/api/endpoints';
import type { ListParams } from '@/api/types';
import { useConfirm } from '@/components/Confirm';
import { Badge, Checkbox, Column, DataTable, ErrorBox, Input, Modal, PageHeader, Pagination, Select, Textarea, Toolbar } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { useAction, useDebounced } from '@/lib/hooks';

type FieldType = 'text' | 'number' | 'time' | 'date' | 'checkbox' | 'select' | 'textarea' | 'email';
interface FieldDef {
  name: string; label: string; type: FieldType; required?: boolean; hint?: string;
  options?: { value: string; label: string }[]; min?: number; max?: number; default?: string | boolean;
}
interface CrudApi {
  list(p?: ListParams): Promise<{ items: any[]; meta: any }>;
  create(b: object): Promise<unknown>;
  update(id: string, b: object): Promise<unknown>;
  remove(id: string): Promise<unknown>;
}
export interface MasterConfig {
  key: string; title: string; singular: string; subtitle: string; api: CrudApi;
  fields: FieldDef[]; columns: Column<any>[]; searchHint: string;
}

const active = (r: { isActive: boolean }) => <Badge value={r.isActive ? 'ACTIVE' : 'INACTIVE'} />;
const activeField: FieldDef = { name: 'isActive', label: 'Active', type: 'checkbox', default: true };
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const MASTERS: Record<string, MasterConfig> = {
  departments: {
    key: 'departments', title: 'Departments', singular: 'department', subtitle: 'Organisational units employees belong to.',
    api: departmentsApi, searchHint: 'Search name or description',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      activeField,
    ],
    columns: [
      { key: 'name', header: 'Name', sortKey: 'name', render: (r) => <strong>{r.name}</strong> },
      { key: 'description', header: 'Description', render: (r) => r.description || '—' },
      { key: 'isActive', header: 'Status', render: active },
    ],
  },
  designations: {
    key: 'designations', title: 'Designations', singular: 'designation', subtitle: 'Job titles with a seniority level.',
    api: designationsApi, searchHint: 'Search name or description',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'level', label: 'Seniority level (0–100)', type: 'number', min: 0, max: 100, default: '0' },
      { name: 'description', label: 'Description', type: 'textarea' },
      activeField,
    ],
    columns: [
      { key: 'name', header: 'Name', sortKey: 'name', render: (r) => <strong>{r.name}</strong> },
      { key: 'level', header: 'Level', sortKey: 'level', render: (r) => r.level },
      { key: 'description', header: 'Description', render: (r) => r.description || '—' },
      { key: 'isActive', header: 'Status', render: active },
    ],
  },
  branches: {
    key: 'branches', title: 'Branches', singular: 'branch', subtitle: 'Office locations.',
    api: branchesApi, searchHint: 'Search name, code, city or state',
    fields: [
      { name: 'code', label: 'Code', type: 'text', required: true, hint: 'Unique, e.g. BLR-01' },
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', type: 'text', hint: 'e.g. +91 98765 43210' },
      { name: 'addressLine', label: 'Address', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'state', label: 'State', type: 'text' },
      { name: 'country', label: 'Country', type: 'text' },
      { name: 'pincode', label: 'Pincode', type: 'text' },
      activeField,
    ],
    columns: [
      { key: 'code', header: 'Code', sortKey: 'code', render: (r) => <span className="mono">{r.code}</span> },
      { key: 'name', header: 'Name', sortKey: 'name', render: (r) => <strong>{r.name}</strong> },
      { key: 'city', header: 'City', sortKey: 'city', render: (r) => r.city || '—' },
      { key: 'phone', header: 'Phone', render: (r) => r.phone || '—' },
      { key: 'isActive', header: 'Status', render: active },
    ],
  },
  'work-shifts': {
    key: 'work-shifts', title: 'Work shifts', singular: 'work shift', subtitle: 'Shift timings used for attendance and half-day detection.',
    api: workShiftsApi, searchHint: 'Search shift name',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'startTime', label: 'Start time', type: 'time', required: true, default: '09:00' },
      { name: 'endTime', label: 'End time', type: 'time', required: true, default: '18:00' },
      { name: 'durationMin', label: 'Duration (minutes)', type: 'number', required: true, min: 1, max: 1440, default: '540' },
      { name: 'graceMin', label: 'Late grace (minutes)', type: 'number', min: 0, max: 240, default: '0' },
      activeField,
    ],
    columns: [
      { key: 'name', header: 'Name', sortKey: 'name', render: (r) => <strong>{r.name}</strong> },
      { key: 'time', header: 'Timing', sortKey: 'startTime', render: (r) => `${r.startTime} – ${r.endTime}` },
      { key: 'dur', header: 'Duration', render: (r) => `${Math.floor(r.durationMin / 60)}h ${r.durationMin % 60}m` },
      { key: 'grace', header: 'Grace', render: (r) => `${r.graceMin} min` },
      { key: 'isActive', header: 'Status', render: active },
    ],
  },
  'leave-types': {
    key: 'leave-types', title: 'Leave types', singular: 'leave type', subtitle: 'Leave categories and yearly entitlement (0 = unlimited).',
    api: leaveTypesApi, searchHint: 'Search name or code',
    fields: [
      { name: 'code', label: 'Code', type: 'text', required: true, hint: 'e.g. CL' },
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'maxDaysYear', label: 'Days per year', type: 'number', min: 0, max: 366, default: '0' },
      { name: 'isPaid', label: 'Paid leave', type: 'checkbox', default: true },
      activeField,
    ],
    columns: [
      { key: 'code', header: 'Code', sortKey: 'code', render: (r) => <span className="mono">{r.code}</span> },
      { key: 'name', header: 'Name', sortKey: 'name', render: (r) => <strong>{r.name}</strong> },
      { key: 'days', header: 'Days / year', render: (r) => (r.maxDaysYear ? r.maxDaysYear : 'Unlimited') },
      { key: 'paid', header: 'Paid', render: (r) => (r.isPaid ? 'Yes' : 'No') },
      { key: 'isActive', header: 'Status', render: active },
    ],
  },
  holidays: {
    key: 'holidays', title: 'National holidays', singular: 'holiday', subtitle: 'Holidays are excluded when counting leave days and shown in the attendance calendar.',
    api: holidaysApi, searchHint: 'Search holiday name',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'date', label: 'Date', type: 'date', required: true },
      activeField,
    ],
    columns: [
      { key: 'date', header: 'Date', sortKey: 'date', render: (r) => fmtDate(r.date) },
      { key: 'name', header: 'Name', sortKey: 'name', render: (r) => <strong>{r.name}</strong> },
      { key: 'year', header: 'Year', render: (r) => r.year },
      { key: 'isActive', header: 'Status', render: active },
    ],
  },
  'blood-groups': {
    key: 'blood-groups', title: 'Blood groups', singular: 'blood group', subtitle: 'Reference list used in employee profiles.',
    api: bloodGroupsApi, searchHint: 'Search blood group',
    fields: [{ name: 'name', label: 'Blood group', type: 'select', required: true, options: BLOOD.map((b) => ({ value: b, label: b })) }],
    columns: [{ key: 'name', header: 'Blood group', sortKey: 'name', render: (r) => <strong>{r.name}</strong> }],
  },
};

type Values = Record<string, string | boolean>;

function initialValues(fields: FieldDef[], row?: Record<string, any>): Values {
  const v: Values = {};
  for (const f of fields) {
    const src = row?.[f.name];
    if (f.type === 'checkbox') v[f.name] = row ? Boolean(src) : Boolean(f.default ?? false);
    else if (f.type === 'date') v[f.name] = src ? String(src).slice(0, 10) : '';
    else v[f.name] = src === undefined || src === null ? String(f.default ?? '') : String(src);
  }
  return v;
}

/** Empty optional values are omitted so the API's validators only see real input. */
function buildPayload(fields: FieldDef[], values: Values): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.type === 'checkbox') out[f.name] = Boolean(v);
    else if (String(v).trim() === '') continue;
    else out[f.name] = f.type === 'number' ? Number(v) : String(v).trim();
  }
  return out;
}

function FieldInput({ f, values, set }: { f: FieldDef; values: Values; set(name: string, v: string | boolean): void }) {
  const v = values[f.name];
  if (f.type === 'checkbox') return <Checkbox label={f.label} checked={Boolean(v)} onChange={(c) => set(f.name, c)} />;
  if (f.type === 'textarea') return <Textarea label={f.label} value={String(v)} onChange={(x) => set(f.name, x)} required={f.required} />;
  if (f.type === 'select')
    return <Select name={f.name} label={f.label} value={String(v)} onChange={(x) => set(f.name, x)} options={f.options ?? []} required={f.required} />;
  return (
    <Input
      label={f.label} name={f.name} type={f.type} value={String(v)} onChange={(x) => set(f.name, x)}
      required={f.required} hint={f.hint} min={f.min} max={f.max}
    />
  );
}

export function MasterPage({ config }: { config: MasterConfig }) {
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  const [editing, setEditing] = useState<{ row?: Record<string, any> } | null>(null);
  const q = useDebounced(search);

  const params: ListParams = { page, size, ...(q ? { search: q } : {}), ...(sort ? { sort } : {}) };
  const listKey = ['master', config.key];
  const list = useQuery({ queryKey: [...listKey, params], queryFn: () => config.api.list(params), placeholderData: (p) => p });

  const remove = useAction((id: string) => config.api.remove(id), { success: `${config.singular} deleted`, invalidate: [listKey, ['ref']] });

  const columns: Column<any>[] = [
    ...config.columns,
    {
      key: 'actions', header: '', align: 'right', width: '150px',
      render: (r) => (
        <div className="row-actions">
          <button className="btn btn-sm" onClick={() => setEditing({ row: r })} data-testid="edit-row">Edit</button>
          <button
            className="btn btn-sm btn-danger" data-testid="delete-row"
            onClick={async () => {
              const c = await confirm({ title: `Delete ${config.singular}?`, message: 'This cannot be undone. Records that still use it will block the deletion.', confirmText: 'Delete', danger: true });
              if (c.ok) remove.mutate(r.id);
            }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={config.title} subtitle={config.subtitle}
        actions={<button className="btn btn-primary" data-testid="add-new" onClick={() => setEditing({})}>+ Add {config.singular}</button>}
      />
      <Toolbar>
        <input className="grow" placeholder={config.searchHint} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search" />
      </Toolbar>
      {list.isError && <ErrorBox error={list.error} />}
      <DataTable columns={columns} rows={list.data?.items} loading={list.isLoading} sort={sort} onSort={setSort} testId="master-table" />
      <Pagination meta={list.data?.meta} onPage={setPage} onSize={(s) => { setSize(s); setPage(1); }} />
      {editing && <MasterForm config={config} row={editing.row} onClose={() => setEditing(null)} listKey={listKey} />}
    </>
  );
}

function MasterForm({ config, row, onClose, listKey }: { config: MasterConfig; row?: Record<string, any>; onClose(): void; listKey: string[] }): ReactNode {
  const [values, setValues] = useState<Values>(() => initialValues(config.fields, row));
  const save = useAction(
    (payload: object) => (row ? config.api.update(row.id, payload) : config.api.create(payload)),
    { success: row ? `${config.singular} updated` : `${config.singular} created`, invalidate: [listKey, ['ref']], onSuccess: onClose },
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(buildPayload(config.fields, values));
  };
  return (
    <Modal
      title={`${row ? 'Edit' : 'Add'} ${config.singular}`} onClose={onClose}
      footer={
        <>
          <button className="btn" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="master-form" type="submit" disabled={save.isPending} data-testid="save">{save.isPending ? 'Saving…' : 'Save'}</button>
        </>
      }
    >
      <form id="master-form" onSubmit={submit} className="form-grid">
        {config.fields.map((f) => (
          <div key={f.name} className={f.type === 'textarea' || f.name === 'addressLine' ? 'span2' : ''}>
            <FieldInput f={f} values={values} set={(n, v) => setValues((s) => ({ ...s, [n]: v }))} />
          </div>
        ))}
      </form>
    </Modal>
  );
}
