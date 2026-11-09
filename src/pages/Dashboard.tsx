import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { TodayCard } from '@/components/TodayCard';
import { ErrorBox, PageHeader, Spinner } from '@/components/ui';
import { fmtDate, titleCase } from '@/lib/format';

function Bars({ rows }: { rows: { name: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return <p className="muted">No data yet.</p>;
  return (
    <>
      {rows.map((r) => (
        <div className="bar-row" key={r.name}>
          <span title={r.name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
          <div className="bar"><i style={{ width: `${(r.count / max) * 100}%` }} /></div>
          <b>{r.count}</b>
        </div>
      ))}
    </>
  );
}

export function DashboardPage() {
  const { user, hasRole } = useAuth();
  const isHr = hasRole('ADMIN', 'HR');
  const summary = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.summary, enabled: isHr });
  const s = summary.data;

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${user?.email}`} />
      <TodayCard />
      {isHr && (
        <div className="section">
          {summary.isLoading && <Spinner />}
          {summary.isError && <ErrorBox error={summary.error} />}
          {s && (
            <>
              <div className="grid g4" data-testid="stats">
                <div className="card stat"><b data-testid="stat-active">{s.employees.active}</b><span>Active employees</span></div>
                <div className="card stat"><b>{s.today.present}</b><span>Present today</span></div>
                <div className="card stat"><b>{s.today.onLeave}</b><span>On leave today</span></div>
                <Link to="/leaves" className="card stat" style={{ color: 'inherit' }}><b>{s.pendingLeaves}</b><span>Pending leave requests</span></Link>
              </div>
              <div className="grid g2 section">
                <div className="card"><h3>Headcount by department</h3><Bars rows={s.byDepartment} /></div>
                <div className="card"><h3>Headcount by designation</h3><Bars rows={s.byDesignation} /></div>
                <div className="card"><h3>Gender</h3><Bars rows={s.byGender.map((g) => ({ name: titleCase(g.gender), count: g.count }))} /></div>
                <div className="card">
                  <h3>Upcoming holidays</h3>
                  {s.upcomingHolidays.length ? (
                    <table className="table"><tbody>
                      {s.upcomingHolidays.map((h) => (<tr key={h.id}><td>{fmtDate(h.date)}</td><td><strong>{h.name}</strong></td></tr>))}
                    </tbody></table>
                  ) : <p className="muted">No upcoming holidays. Add some under Master data → Holidays.</p>}
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {!isHr && (
        <div className="grid g2 section">
          <Link to="/leaves" className="card" style={{ color: 'inherit' }}><h3>Leaves →</h3><p className="muted">Apply for leave and check your balance.</p></Link>
          <Link to="/attendance" className="card" style={{ color: 'inherit' }}><h3>Attendance →</h3><p className="muted">View your month calendar and records.</p></Link>
        </div>
      )}
    </>
  );
}
