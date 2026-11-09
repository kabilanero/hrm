import { useQuery } from '@tanstack/react-query';
import { attendanceApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { fmtMinutes, fmtTime } from '@/lib/format';
import { useAction } from '@/lib/hooks';
import { Badge, ErrorBox } from './ui';

/** Punch in / punch out widget for the signed-in employee. */
export function TodayCard() {
  const { user } = useAuth();
  const today = useQuery({ queryKey: ['attendance', 'today'], queryFn: attendanceApi.today, enabled: !!user?.employeeId });
  const refresh = [['attendance'], ['dashboard']];
  const punchIn = useAction(attendanceApi.punchIn, { success: 'Punched in', invalidate: refresh });
  const punchOut = useAction(attendanceApi.punchOut, { success: 'Punched out', invalidate: refresh });

  if (!user?.employeeId) {
    return (
      <div className="card">
        <h3>Today</h3>
        <p className="muted">Your login is not linked to an employee record, so punching is unavailable. Ask an administrator to link it.</p>
      </div>
    );
  }
  const a = today.data;
  const done = !!a?.punchIn && !!a?.punchOut;
  return (
    <div className="card" data-testid="today-card">
      <h3>Today</h3>
      {today.isError && <ErrorBox error={today.error} />}
      <div className="grid g3" style={{ marginBottom: 14 }}>
        <div className="stat"><b data-testid="punch-in-time">{fmtTime(a?.punchIn)}</b><span>Punch in</span></div>
        <div className="stat"><b data-testid="punch-out-time">{fmtTime(a?.punchOut)}</b><span>Punch out</span></div>
        <div className="stat"><b>{fmtMinutes(a?.workedMinutes)}</b><span>Worked {a?.status && <Badge value={a.status} />}</span></div>
      </div>
      {!a?.punchIn && (
        <button className="btn btn-primary" onClick={() => punchIn.mutate()} disabled={punchIn.isPending} data-testid="punch-in">Punch in</button>
      )}
      {a?.punchIn && !a.punchOut && (
        <button className="btn btn-primary" onClick={() => punchOut.mutate()} disabled={punchOut.isPending} data-testid="punch-out">Punch out</button>
      )}
      {done && <div className="alert alert-ok" style={{ marginBottom: 0 }}>You are done for today.</div>}
    </div>
  );
}
