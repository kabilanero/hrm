import { useQuery } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { attendanceApi } from '@/api/endpoints';
import type { Attendance, AttendanceStatus, ListParams, MonthlyDay } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { TodayCard } from '@/components/TodayCard';
import { Badge, Column, DataTable, ErrorBox, Input, Modal, PageHeader, Pagination, Select, Spinner, Textarea, Toolbar } from '@/components/ui';
import { fmtDate, fmtMinutes, fmtTime, titleCase } from '@/lib/format';
import { useAction } from '@/lib/hooks';
import { useEmployeeOptions } from '@/lib/refdata';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEK_OFF'];

export function AttendancePage() {
  const { user, hasRole } = useAuth();
  const isHr = hasRole('ADMIN', 'HR');
  const isStaff = hasRole('ADMIN', 'HR', 'MANAGER');
  const people = useEmployeeOptions(isStaff);
  const [employeeId, setEmployeeId] = useState('');
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [correcting, setCorrecting] = useState(false);

  const target = employeeId || user?.employeeId || '';
  const monthly = useQuery({
    queryKey: ['attendance', 'monthly', target, ym],
    queryFn: () => attendanceApi.monthly({ ...ym, ...(employeeId ? { employeeId } : {}) }),
    enabled: !!target,
  });
  const shift = (d: number) => setYm(({ year, month }) => { const m = month + d; return m < 1 ? { year: year - 1, month: 12 } : m > 12 ? { year: year + 1, month: 1 } : { year, month: m }; });

  return (
    <>
      <PageHeader title="Attendance" subtitle="Punch in and out, review your month and see team records."
        actions={isHr && <button className="btn" onClick={() => setCorrecting(true)} data-testid="correct-record">Correct / add record</button>} />
      <TodayCard />

      <div className="card section">
        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Month calendar</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {isStaff && (
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} aria-label="Calendar employee">
                <option value="">{user?.employeeId ? 'Myself' : 'Choose employee…'}</option>
                {people.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            <button className="btn btn-sm" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
            <strong data-testid="month-label" style={{ minWidth: 130, textAlign: 'center' }}>{MONTHS[ym.month - 1]} {ym.year}</strong>
            <button className="btn btn-sm" onClick={() => shift(1)} aria-label="Next month">›</button>
          </div>
        </div>
        {!target && <p className="muted">Choose an employee to see their calendar.</p>}
        {monthly.isLoading && target && <Spinner />}
        {monthly.isError && <ErrorBox error={monthly.error} />}
        {monthly.data && <Calendar year={ym.year} month={ym.month} days={monthly.data.days} summary={monthly.data.summary} />}
      </div>

      <Records isStaff={isStaff} people={people.options} />
      {correcting && <Correct people={people.options} onClose={() => setCorrecting(false)} />}
    </>
  );
}

function Calendar({ year, month, days, summary }: { year: number; month: number; days: MonthlyDay[]; summary: { present: number; halfDay: number; absent: number; onLeave: number; holidays: number; weekOffs: number; workedMinutes: number } }) {
  const lead = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return (
    <>
      <div className="legend" data-testid="cal-summary">
        <Badge value={`Present ${summary.present}`} tone="green" /><Badge value={`Half day ${summary.halfDay}`} tone="amber" /><Badge value={`Absent ${summary.absent}`} tone="red" />
        <Badge value={`On leave ${summary.onLeave}`} tone="blue" /><Badge value={`Holidays ${summary.holidays}`} tone="violet" /><Badge value={`Week-off ${summary.weekOffs}`} tone="gray" />
        <span className="muted">Worked {fmtMinutes(summary.workedMinutes)}</span>
      </div>
      <div className="cal" style={{ marginTop: 12 }} data-testid="calendar">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="cal-h">{d}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={`b${i}`} className="cal-d blank" />)}
        {days.map((d) => (
          <div key={d.date} className={`cal-d ${d.status ? `cal-${d.status}` : ''}`} data-date={d.date} data-status={d.status ?? ''} title={d.holiday ?? undefined}>
            <span className="n">{Number(d.date.slice(8))}</span>
            {d.status && <small>{d.holiday ?? titleCase(d.status)}</small>}
            {d.punchIn && <small>{fmtTime(d.punchIn)}–{fmtTime(d.punchOut)}</small>}
          </div>
        ))}
      </div>
    </>
  );
}

function Records({ isStaff, people }: { isStaff: boolean; people: { value: string; label: string }[] }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [employeeId, setEmployeeId] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const params: ListParams = { page, size, sort: 'date:desc', ...(employeeId ? { employeeId } : {}), ...(status ? { status } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) };
  const list = useQuery({ queryKey: ['attendance', 'list', params], queryFn: () => attendanceApi.list(params), placeholderData: (p) => p });
  const columns: Column<Attendance>[] = [
    { key: 'date', header: 'Date', sortKey: 'date', render: (a) => fmtDate(a.date) },
    ...(isStaff ? [{ key: 'emp', header: 'Employee', render: (a: Attendance) => a.employee?.employeeName ?? '—' }] : []),
    { key: 'in', header: 'In', render: (a) => fmtTime(a.punchIn) },
    { key: 'out', header: 'Out', render: (a) => fmtTime(a.punchOut) },
    { key: 'worked', header: 'Worked', render: (a) => fmtMinutes(a.workedMinutes) },
    { key: 'status', header: 'Status', render: (a) => (a.status ? <Badge value={a.status} /> : '—') },
    { key: 'remarks', header: 'Remarks', render: (a) => a.remarks || '—' },
  ];
  return (
    <div className="section">
      <h3>Attendance records</h3>
      <Toolbar>
        {isStaff && (
          <select value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setPage(1); }} aria-label="Employee">
            <option value="">All employees</option>{people.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
          <option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </select>
        <label className="muted">From <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
        <label className="muted">To <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
      </Toolbar>
      {list.isError && <ErrorBox error={list.error} />}
      <DataTable columns={columns} rows={list.data?.items} loading={list.isLoading} testId="attendance-table" empty="No attendance records" />
      <Pagination meta={list.data?.meta} onPage={setPage} onSize={(s) => { setSize(s); setPage(1); }} />
    </div>
  );
}

/** datetime-local value ("2026-11-06T09:00") -> ISO instant using the browser's timezone */
const toIso = (local: string) => (local ? new Date(local).toISOString() : undefined);

function Correct({ people, onClose }: { people: { value: string; label: string }[]; onClose(): void }) {
  const [v, setV] = useState({ employeeId: '', date: '', punchIn: '', punchOut: '', status: '', remarks: '' });
  const s = (k: keyof typeof v) => (x: string) => setV((p) => ({ ...p, [k]: x }));
  const save = useAction((b: object) => attendanceApi.upsert(b), { success: 'Attendance saved', invalidate: [['attendance']], onSuccess: onClose });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = { employeeId: v.employeeId, date: v.date };
    if (v.punchIn) body.punchIn = toIso(v.punchIn);
    if (v.punchOut) body.punchOut = toIso(v.punchOut);
    if (v.status) body.status = v.status;
    if (v.remarks.trim()) body.remarks = v.remarks.trim();
    save.mutate(body);
  };
  return (
    <Modal title="Correct / add attendance" onClose={onClose} footer={<><button className="btn" onClick={onClose} type="button">Cancel</button><button className="btn btn-primary" form="att-form" type="submit" disabled={save.isPending} data-testid="save">Save</button></>}>
      <form id="att-form" onSubmit={submit} className="form-grid">
        <Select label="Employee" name="employeeId" value={v.employeeId} onChange={s('employeeId')} options={people} required />
        <Input label="Date" name="date" type="date" value={v.date} onChange={s('date')} required />
        <Input label="Punch in" name="punchIn" type="datetime-local" value={v.punchIn} onChange={s('punchIn')} />
        <Input label="Punch out" name="punchOut" type="datetime-local" value={v.punchOut} onChange={s('punchOut')} />
        <Select label="Status" name="status" value={v.status} onChange={s('status')} options={STATUSES.map((x) => ({ value: x, label: titleCase(x) }))} placeholder="Keep / auto" />
        <div className="span2"><Textarea label="Remarks" value={v.remarks} onChange={s('remarks')} rows={2} /></div>
      </form>
    </Modal>
  );
}
