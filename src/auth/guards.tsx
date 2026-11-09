import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { RoleName } from '@/api/types';
import { useAuth } from './AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: RoleName[]; children: ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) {
    return (
      <div className="card empty">
        <h2>Access denied</h2>
        <p>Your role does not have permission to view this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}
