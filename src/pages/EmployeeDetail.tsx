import { useQuery } from '@tanstack/react-query';
import { ChangeEvent, FormEvent, ReactNode, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { employeesApi } from '@/api/endpoints';
import type { BankAccount, Employee, EmployeeAddress } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useConfirm } from '@/components/Confirm';
import { useToast } from '@/components/Toast';
import { Badge, Checkbox, Column, DataTable, ErrorBox, Input, Modal, PageHeader, Select, Spinner } from '@/components/ui';
import { fmtDate, fmtMoney, titleCase } from '@/lib/format';
import { useAction } from '@/lib/hooks';

export function EmployeeDetailPage() {
  const { id } = useParams();
  return <EmployeeProfileView employeeId={id!} />;
}

type Tab = 'overview' | 'addresses' | 'bank' | 'team';

function KV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="kv">
      {rows.map(([k, v]) => (<div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v || '—'}</dd></div>))}
    </dl>
  );
}

export function EmployeeProfileView({ employeeId }: { employeeId: string }) {
  const { user, hasRole } = useAuth();
  const isHr = hasRole('ADMIN', 'HR');
  const isSelf = user?.employeeId === employeeId;
  const [tab, setTab] = useState<Tab>('overview');

  const emp = useQuery({ queryKey: ['employee', employeeId], queryFn: () => employeesApi.get(employeeId) });
  if (emp.isLoading) return <Spinner />;
  if (emp.isError) return <ErrorBox error={emp.error} />;
  const e = emp.data!;

  const tabs: [Tab, string][] = [['overview', 'Overview'], ['addresses', 'Addresses'], ['bank', 'Bank accounts'], ['team', 'Team']];
  return (
    <>
      <PageHeader
        title={e.employeeName}
        subtitle={`${e.employeeCode} · ${e.designation?.name ?? 'No designation'} · ${e.department?.name ?? 'No department'}`}
        actions={isHr && <Link className="btn" to={`/employees/${e.id}/edit`}>Edit employee</Link>}
      />
      <div className="card profile-head">
        <Photo employee={e} canUpload={isHr} />
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>{e.employeeName}</h2>
            <Badge value={e.isActive ? 'ACTIVE' : 'INACTIVE'} />
            {e.isDepartmentHead && <Badge value="DEPT HEAD" tone="violet" />}
          </div>
          <p className="muted">{e.emailId}{e.contactNumber ? ` · ${e.contactNumber}` : ''}</p>
          <p className="muted">Reports to: {e.reportsTo ? <Link to={`/employees/${e.reportsTo.id}`}>{e.reportsTo.employeeName}</Link> : '—'}</p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)} data-testid={`tab-${k}`}>{label}</button>
        ))}
      </div>
      {tab === 'overview' && <Overview e={e} />}
      {tab === 'addresses' && <Addresses employeeId={employeeId} canWrite={isHr || isSelf} />}
      {tab === 'bank' && <Banks employeeId={employeeId} canWrite={isHr || isSelf} canRead={isHr || isSelf} />}
      {tab === 'team' && <Team employeeId={employeeId} />}
    </>
  );
}

function Overview({ e }: { e: Employee }) {
  return (
    <div className="grid g2">
      <div className="card"><h3>Personal</h3><KV rows={[
        ['Father\'s name', e.fatherName], ['Gender', e.gender && titleCase(e.gender)], ['Marital status', e.maritalStatus && titleCase(e.maritalStatus)],
        ['Date of birth', e.dateOfBirth && fmtDate(e.dateOfBirth)], ['Blood group', e.bloodGroup?.name], ['Qualification', e.highestQualification],
      ]} /></div>
      <div className="card"><h3>Contact</h3><KV rows={[
        ['Work email', e.emailId], ['Secondary email', e.secondaryEmailId], ['Mobile', e.contactNumber], ['Alternate', e.alterMobileNumber], ['Emergency', e.emergencyContactNumber],
      ]} /></div>
      <div className="card"><h3>Employment</h3><KV rows={[
        ['Joined', fmtDate(e.dateOfJoining)], ['Resigned', e.dateOfResign && fmtDate(e.dateOfResign)], ['Department', e.department?.name], ['Designation', e.designation?.name],
        ['Default branch', e.defaultBranch && `${e.defaultBranch.name} (${e.defaultBranch.code})`], ['Branches', e.branches?.map((b) => b.name).join(', ')],
        ['Work shift', e.workShift && `${e.workShift.name} ${e.workShift.startTime}–${e.workShift.endTime}`], ['Travel trackable', e.isTravelTrackable ? 'Yes' : 'No'],
      ]} /></div>
      <div className="card"><h3>Statutory & pay</h3><KV rows={[
        ['Basic pay', e.basicPay != null && fmtMoney(e.basicPay)], ['PF UAN', e.pfUANNo], ['ESI reference', e.esiRefNo],
      ]} /></div>
    </div>
  );
}

function Photo({ employee, canUpload }: { employee: Employee; canUpload: boolean }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [broken, setBroken] = useState(false);
  const img = useQuery({ queryKey: ['employee-image', employee.id, employee.profileImagePath], queryFn: () => employeesApi.imageUrl(employee.id), enabled: !!employee.profileImagePath });
  const upload = useAction((file: File) => employeesApi.uploadImage(employee.id, file), {
    success: 'Photo updated', invalidate: [['employee'], ['employee-image']], onSuccess: () => setBroken(false),
  });
  const pick = (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be 2 MB or smaller.');
    upload.mutate(file);
  };
  const url = img.data?.url;
  return (
    <div style={{ textAlign: 'center' }}>
      {url && !broken ? <img className="avatar" src={url} alt={employee.employeeName} onError={() => setBroken(true)} data-testid="avatar-img" /> : <div className="avatar">{employee.employeeName.slice(0, 1).toUpperCase()}</div>}
      {canUpload && (
        <>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} data-testid="photo-input" />
          <button className="link-btn" style={{ marginTop: 6 }} onClick={() => input.current?.click()} disabled={upload.isPending}>{upload.isPending ? 'Uploading…' : 'Change photo'}</button>
        </>
      )}
    </div>
  );
}

function Addresses({ employeeId, canWrite }: { employeeId: string; canWrite: boolean }) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState<{ row?: EmployeeAddress } | null>(null);
  const list = useQuery({ queryKey: ['addresses', employeeId], queryFn: () => employeesApi.addresses(employeeId) });
  const remove = useAction((aid: string) => employeesApi.removeAddress(employeeId, aid), { success: 'Address removed', invalidate: [['addresses', employeeId]] });
  const columns: Column<EmployeeAddress>[] = [
    { key: 'type', header: 'Type', render: (a) => <Badge value={a.type} tone="blue" /> },
    { key: 'line', header: 'Address', render: (a) => a.addressLine },
    { key: 'city', header: 'City / State', render: (a) => [a.city, a.state].filter(Boolean).join(', ') || '—' },
    { key: 'pin', header: 'Pincode', render: (a) => a.pincode || '—' },
    ...(canWrite ? [{
      key: 'actions', header: '', align: 'right' as const, render: (a: EmployeeAddress) => (
        <div className="row-actions">
          <button className="btn btn-sm" onClick={() => setEditing({ row: a })}>Edit</button>
          <button className="btn btn-sm btn-danger" onClick={async () => { if ((await confirm({ title: 'Remove address?', message: a.addressLine, confirmText: 'Remove', danger: true })).ok) remove.mutate(a.id); }}>Remove</button>
        </div>
      ),
    }] : []),
  ];
  return (
    <>
      {canWrite && <div className="toolbar"><button className="btn btn-primary" onClick={() => setEditing({})} data-testid="add-address">+ Add address</button></div>}
      {list.isError && <ErrorBox error={list.error} />}
      <DataTable columns={columns} rows={list.data} loading={list.isLoading} empty="No addresses on file" testId="address-table" />
      {editing && <AddressForm employeeId={employeeId} row={editing.row} onClose={() => setEditing(null)} />}
    </>
  );
}

function AddressForm({ employeeId, row, onClose }: { employeeId: string; row?: EmployeeAddress; onClose(): void }) {
  const [v, setV] = useState({ type: row?.type ?? 'CURRENT', addressLine: row?.addressLine ?? '', city: row?.city ?? '', district: row?.district ?? '', state: row?.state ?? '', country: row?.country ?? '', pincode: row?.pincode ?? '' });
  const save = useAction((b: object) => (row ? employeesApi.updateAddress(employeeId, row.id, b) : employeesApi.addAddress(employeeId, b)), {
    success: row ? 'Address updated' : 'Address added', invalidate: [['addresses', employeeId]], onSuccess: onClose,
  });
  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const body: Record<string, string> = { type: v.type, addressLine: v.addressLine.trim() };
    for (const k of ['city', 'district', 'state', 'country', 'pincode'] as const) if (v[k].trim()) body[k] = v[k].trim();
    save.mutate(body);
  };
  const s = (k: keyof typeof v) => (x: string) => setV((p) => ({ ...p, [k]: x }));
  return (
    <Modal title={row ? 'Edit address' : 'Add address'} onClose={onClose} footer={<><button className="btn" onClick={onClose} type="button">Cancel</button><button className="btn btn-primary" form="addr-form" type="submit" disabled={save.isPending} data-testid="save">Save</button></>}>
      <form id="addr-form" onSubmit={submit} className="form-grid">
        <Select label="Type" value={v.type} onChange={s('type')} options={[{ value: 'CURRENT', label: 'Current' }, { value: 'PERMANENT', label: 'Permanent' }]} />
        <Input label="Address line" name="addressLine" value={v.addressLine} onChange={s('addressLine')} required minLength={3} />
        <Input label="City" name="city" value={v.city} onChange={s('city')} />
        <Input label="District" value={v.district} onChange={s('district')} />
        <Input label="State" value={v.state} onChange={s('state')} />
        <Input label="Country" value={v.country} onChange={s('country')} />
        <Input label="Pincode" name="pincode" value={v.pincode} onChange={s('pincode')} />
      </form>
    </Modal>
  );
}

function Banks({ employeeId, canWrite, canRead }: { employeeId: string; canWrite: boolean; canRead: boolean }) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState<{ row?: BankAccount } | null>(null);
  const list = useQuery({ queryKey: ['banks', employeeId], queryFn: () => employeesApi.bankAccounts(employeeId), enabled: canRead });
  const remove = useAction((bid: string) => employeesApi.removeBank(employeeId, bid), { success: 'Bank account removed', invalidate: [['banks', employeeId]] });
  if (!canRead) return <div className="alert alert-info">Bank details are visible only to the employee and HR.</div>;
  const columns: Column<BankAccount>[] = [
    { key: 'bank', header: 'Bank', render: (b) => <strong>{b.bankName}</strong> },
    { key: 'acc', header: 'Account number', render: (b) => <span className="mono">{b.accountNumber}</span> },
    { key: 'ifsc', header: 'IFSC', render: (b) => <span className="mono">{b.ifscCode}</span> },
    { key: 'primary', header: 'Primary', render: (b) => (b.isPrimary ? <Badge value="PRIMARY" tone="green" /> : '—') },
    ...(canWrite ? [{
      key: 'actions', header: '', align: 'right' as const, render: (b: BankAccount) => (
        <div className="row-actions">
          <button className="btn btn-sm" onClick={() => setEditing({ row: b })}>Edit</button>
          <button className="btn btn-sm btn-danger" onClick={async () => { if ((await confirm({ title: 'Remove bank account?', message: `${b.bankName} ${b.accountNumber}`, confirmText: 'Remove', danger: true })).ok) remove.mutate(b.id); }}>Remove</button>
        </div>
      ),
    }] : []),
  ];
  return (
    <>
      {canWrite && <div className="toolbar"><button className="btn btn-primary" onClick={() => setEditing({})} data-testid="add-bank">+ Add bank account</button></div>}
      {list.isError && <ErrorBox error={list.error} />}
      <DataTable columns={columns} rows={list.data} loading={list.isLoading} empty="No bank accounts on file" testId="bank-table" />
      {editing && <BankForm employeeId={employeeId} row={editing.row} onClose={() => setEditing(null)} />}
    </>
  );
}

function BankForm({ employeeId, row, onClose }: { employeeId: string; row?: BankAccount; onClose(): void }) {
  const [v, setV] = useState({ bankName: row?.bankName ?? '', accountNumber: row?.accountNumber ?? '', ifscCode: row?.ifscCode ?? '', isPrimary: row?.isPrimary ?? false });
  const save = useAction((b: object) => (row ? employeesApi.updateBank(employeeId, row.id, b) : employeesApi.addBank(employeeId, b)), {
    success: row ? 'Bank account updated' : 'Bank account added', invalidate: [['banks', employeeId]], onSuccess: onClose,
  });
  return (
    <Modal title={row ? 'Edit bank account' : 'Add bank account'} onClose={onClose} footer={<><button className="btn" onClick={onClose} type="button">Cancel</button><button className="btn btn-primary" form="bank-form" type="submit" disabled={save.isPending} data-testid="save">Save</button></>}>
      <form id="bank-form" onSubmit={(ev) => { ev.preventDefault(); save.mutate({ ...v, bankName: v.bankName.trim(), accountNumber: v.accountNumber.trim(), ifscCode: v.ifscCode.trim().toUpperCase() }); }}>
        <Input label="Bank name" name="bankName" value={v.bankName} onChange={(x) => setV((p) => ({ ...p, bankName: x }))} required />
        <Input label="Account number" name="accountNumber" value={v.accountNumber} onChange={(x) => setV((p) => ({ ...p, accountNumber: x }))} required hint="6–34 letters or digits" />
        <Input label="IFSC code" name="ifscCode" value={v.ifscCode} onChange={(x) => setV((p) => ({ ...p, ifscCode: x }))} required hint="e.g. HDFC0001234" />
        <Checkbox label="Primary account" checked={v.isPrimary} onChange={(x) => setV((p) => ({ ...p, isPrimary: x }))} />
      </form>
    </Modal>
  );
}

function Team({ employeeId }: { employeeId: string }) {
  const list = useQuery({ queryKey: ['reportees', employeeId], queryFn: () => employeesApi.reportees(employeeId) });
  if (list.isLoading) return <Spinner />;
  if (list.isError) return <ErrorBox error={list.error} />;
  return (
    <DataTable
      columns={[
        { key: 'code', header: 'Code', render: (r) => <span className="mono">{r.employeeCode}</span> },
        { key: 'name', header: 'Name', render: (r) => <Link to={`/employees/${r.id}`}>{r.employeeName}</Link> },
        { key: 'desig', header: 'Designation', render: (r) => r.designation?.name ?? '—' },
      ]}
      rows={list.data} empty="No direct reportees" testId="team-table"
    />
  );
}
