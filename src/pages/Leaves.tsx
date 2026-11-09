import { useQuery } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { leavesApi } from '@/api/endpoints';
import type { Leave, LeaveStatus, ListParams } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useConfirm } from '@/components/Confirm';
import { Badge, Column, DataTable, ErrorBox, Input, Modal, PageHeader, Pagination, Select, Textarea, Toolbar } from '@/components/ui';
import { fmtDate, fmtDays } from '@/lib/format';
import { useAction } from '@/lib/hooks';
import { useEmployeeOptions, useLeaveTypes } from '@/lib/refdata';

const STATUSES: LeaveStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'CANCELLED'];

export function LeavesPage() {
  const { user, hasRole } = useAuth();
  const confirm = useConfirm();
  const isHr = hasRole('ADMIN', 'HR');
  const isStaff = hasRole('ADMIN', 'HR', 'MANAGER');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [status, setStatus] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [applying, setApplying] = useState(false);
  const people = useEmployeeOptions(isStaff);

  const params: ListParams = { page, size, sort: 'createdAt:desc', ...(status ? { status } : {}), ...(employeeId ? { employeeId } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) };
  const list = useQuery({ queryKey: ['leaves', params], queryFn: () => leavesApi.list(params), placeholderData: (p) => p });

  const balanceFor = employeeId || user?.employeeId || '';
  const balance = useQuery({
    queryKey: ['leave-balance', balanceFor, year],
    queryFn: () => leavesApi.balance({ year, ...(employeeId ? { employeeId } : {}) }),
    enabled: !!balanceFor,
  });

  const refresh = [['leaves'], ['leave-balance'], ['dashboard']];
  const decide = useAction((a: { id: string; status: 'APPROVED' | 'REJECTED'; remarks?: string }) => leavesApi.decide(a.id, a.status, a.remarks), { success: (l) => `Leave ${l.status.toLowerCase()}`, invalidate: refresh });
  const revoke = useAction(leavesApi.revoke, { success: 'Leave revoked', invalidate: refresh });
  const cancel = useAction(leavesApi.cancel, { success: 'Leave cancelled', invalidate: refresh });

  const ask = async (l: Leave, s: 'APPROVED' | 'REJECTED') => {
    const c = await confirm({
      title: `${s === 'APPROVED' ? 'Approve' : 'Reject'} leave?`, confirmText: s === 'APPROVED' ? 'Approve' : 'Reject', danger: s === 'REJECTED',
      message: `${l.employee.employeeName}: ${fmtDate(l.startDate)} → ${fmtDate(l.endDate)} (${fmtDays(l.noOfDays)} day(s))`,
      input: { label: 'Remarks (optional)' },
    });
    if (c.ok) decide.mutate({ id: l.id, status: s, remarks: c.text || undefined });
  };

  const columns: Column<Leave>[] = [
    ...(isStaff ? [{ key: 'emp', header: 'Employee', render: (l: Leave) => <><strong>{l.employee.employeeName}</strong><div className="muted mono">{l.employee.employeeCode}</div></> }] : []),
    { key: 'type', header: 'Type', render: (l) => l.leaveType.name },
    { key: 'dates', header: 'Dates', render: (l) => `${fmtDate(l.startDate)} → ${fmtDate(l.endDate)}` },
    { key: 'days', header: 'Days', align: 'right', render: (l) => fmtDays(l.noOfDays) },
    { key: 'reason', header: 'Reason', render: (l) => <span title={l.reason}>{l.reason.length > 40 ? `${l.reason.slice(0, 40)}…` : l.reason}</span> },
    { key: 'status', header: 'Status', render: (l) => <><Badge value={l.status} />{l.approver && <div className="muted">by {l.approver.employeeName}</div>}{l.remarks && <div className="muted" title={l.remarks}>“{l.remarks.slice(0, 24)}”</div>}</> },
    {
      key: 'actions', header: '', align: 'right', width: '230px',
      render: (l) => {
        const own = l.employeeId === user?.employeeId;
        return (
          <div className="row-actions">
            {isStaff && l.status === 'PENDING' && (!own || hasRole('ADMIN')) && (<>
              <button className="btn btn-sm btn-primary" onClick={() => ask(l, 'APPROVED')} data-testid="approve">Approve</button>
              <button className="btn btn-sm btn-danger" onClick={() => ask(l, 'REJECTED')} data-testid="reject">Reject</button>
            </>)}
            {l.status === 'PENDING' && (own || isHr) && <button className="btn btn-sm" onClick={() => cancel.mutate(l.id)} data-testid="cancel-leave">Cancel</button>}
            {isStaff && l.status === 'APPROVED' && (!own || hasRole('ADMIN')) && (
              <button className="btn btn-sm" data-testid="revoke" onClick={async () => { if ((await confirm({ title: 'Revoke approved leave?', message: 'The employee will be marked as not on leave for these dates.', confirmText: 'Revoke', danger: true })).ok) revoke.mutate(l.id); }}>Revoke</button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader title="Leaves" subtitle="Apply for leave, track balances and handle approvals." actions={<button className="btn btn-primary" onClick={() => setApplying(true)} data-testid="apply-leave">+ Apply for leave</button>} />

      {balanceFor && (
        <div className="section" style={{ marginTop: 0, marginBottom: 16 }}>
          <div className="toolbar" style={{ marginBottom: 8 }}>
            <strong>Leave balance</strong>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
              {[year - 1, year, year + 1].filter((v, i, a) => a.indexOf(v) === i).map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
          {balance.isError && <ErrorBox error={balance.error} />}
          <div className="grid g4" data-testid="balances">
            {balance.data?.map((b) => (
              <div className="card balance" key={b.leaveTypeId}>
                <span className="muted">{b.name}</span>
                <b>{b.remaining === null ? '∞' : b.remaining}<small className="muted"> {b.remaining === null ? 'unlimited' : `of ${b.entitled} left`}</small></b>
                <small className="muted">Used {b.used} · Pending {b.pending}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      <Toolbar>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status filter">
          <option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {isStaff && (
          <select value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setPage(1); }} aria-label="Employee filter">
            <option value="">All employees</option>{people.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        <label className="muted">From <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
        <label className="muted">To <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
      </Toolbar>
      {list.isError && <ErrorBox error={list.error} />}
      <DataTable columns={columns} rows={list.data?.items} loading={list.isLoading} testId="leave-table" empty="No leave applications" />
      <Pagination meta={list.data?.meta} onPage={setPage} onSize={(s) => { setSize(s); setPage(1); }} />
      {applying && <ApplyLeave onClose={() => setApplying(false)} refresh={refresh} />}
    </>
  );
}

function ApplyLeave({ onClose, refresh }: { onClose(): void; refresh: string[][] }) {
  const { user, hasRole } = useAuth();
  const types = useLeaveTypes();
  const people = useEmployeeOptions(hasRole('ADMIN', 'HR'));
  const needsEmployee = hasRole('ADMIN', 'HR') && !user?.employeeId;
  const [v, setV] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '', employeeId: '' });
  const save = useAction((b: object) => leavesApi.apply(b), { success: (l) => `Leave applied: ${fmtDays(l.noOfDays)} working day(s)`, invalidate: refresh, onSuccess: onClose });
  const s = (k: keyof typeof v) => (x: string) => setV((p) => ({ ...p, [k]: x }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate({ leaveTypeId: v.leaveTypeId, startDate: v.startDate, endDate: v.endDate, reason: v.reason.trim(), ...(v.employeeId ? { employeeId: v.employeeId } : {}) });
  };
  return (
    <Modal title="Apply for leave" onClose={onClose} footer={<><button className="btn" onClick={onClose} type="button">Cancel</button><button className="btn btn-primary" form="leave-form" type="submit" disabled={save.isPending} data-testid="submit-leave">{save.isPending ? 'Submitting…' : 'Submit'}</button></>}>
      <form id="leave-form" onSubmit={submit}>
        {hasRole('ADMIN', 'HR') && (
          <Select label="On behalf of" name="employeeId" value={v.employeeId} onChange={s('employeeId')} options={people.options} required={needsEmployee}
            placeholder={user?.employeeId ? 'Myself' : 'Choose employee…'} hint={needsEmployee ? 'Your login has no employee record, so pick who this is for.' : 'Leave blank to apply for yourself.'} />
        )}
        <Select label="Leave type" name="leaveTypeId" value={v.leaveTypeId} onChange={s('leaveTypeId')} options={types.options} required />
        <div className="form-grid">
          <Input label="From" name="startDate" type="date" value={v.startDate} onChange={s('startDate')} required />
          <Input label="To" name="endDate" type="date" value={v.endDate} onChange={s('endDate')} required min={v.startDate} />
        </div>
        <Textarea label="Reason" value={v.reason} onChange={s('reason')} required />
        <p className="muted">Weekends and national holidays are not counted.</p>
      </form>
    </Modal>
  );
}
