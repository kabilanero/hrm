import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { healthApi } from '@/api/endpoints';
import type { RoleName } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Badge } from './ui';

interface NavItem { to: string; label: string; icon: string; roles?: RoleName[] }
interface NavGroup { title: string; items: NavItem[] }

const HR_ADMIN: RoleName[] = ['ADMIN', 'HR'];
const STAFF: RoleName[] = ['ADMIN', 'HR', 'MANAGER'];

export const NAV: NavGroup[] = [
  {
    title: 'Workspace',
    items: [
      { to: '/', label: 'Dashboard', icon: '▦' },
      { to: '/profile', label: 'My profile', icon: '☺' },
      { to: '/leaves', label: 'Leaves', icon: '✈' },
      { to: '/attendance', label: 'Attendance', icon: '◷' },
    ],
  },
  { title: 'People', items: [{ to: '/employees', label: 'Employees', icon: '☷', roles: STAFF }] },
  {
    title: 'Master data',
    items: [
      { to: '/master/departments', label: 'Departments', icon: '▤', roles: HR_ADMIN },
      { to: '/master/designations', label: 'Designations', icon: '★', roles: HR_ADMIN },
      { to: '/master/branches', label: 'Branches', icon: '⌂', roles: HR_ADMIN },
      { to: '/master/work-shifts', label: 'Work shifts', icon: '☾', roles: HR_ADMIN },
      { to: '/master/leave-types', label: 'Leave types', icon: '✎', roles: HR_ADMIN },
      { to: '/master/holidays', label: 'Holidays', icon: '☀', roles: HR_ADMIN },
      { to: '/master/blood-groups', label: 'Blood groups', icon: '♥', roles: HR_ADMIN },
    ],
  },
  { title: 'Administration', items: [{ to: '/users', label: 'User accounts', icon: '⚿', roles: ['ADMIN'] }] },
  { title: 'Account', items: [{ to: '/account', label: 'Security', icon: '⚙' }] },
];

export function Layout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const health = useQuery({ queryKey: ['health'], queryFn: healthApi.ready, refetchInterval: 30_000, retry: false });

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="logo">H</span><span>HRM Console</span></div>
        <nav>
          {NAV.map((g) => {
            const items = g.items.filter((i) => !i.roles || hasRole(...i.roles));
            if (!items.length) return null;
            return (
              <div key={g.title} className="nav-group">
                <div className="nav-title">{g.title}</div>
                {items.map((i) => (
                  <NavLink key={i.to} to={i.to} end={i.to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <span className="nav-ico" aria-hidden>{i.icon}</span>{i.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="side-foot">
          <span className={`dot ${health.data ? 'ok' : health.isError || health.data === false ? 'bad' : ''}`} />
          <span className="muted" data-testid="api-status">{health.data ? 'API online' : health.isLoading ? 'Checking API…' : 'API offline'}</span>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="muted">Signed in as</div>
          <strong data-testid="whoami">{user?.email}</strong>
          {user && <Badge value={user.role} />}
          <span className="spacer" />
          <button
            className="btn btn-sm"
            data-testid="logout"
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            Sign out
          </button>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
