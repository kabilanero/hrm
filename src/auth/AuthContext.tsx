import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/endpoints';
import { SESSION_EXPIRED } from '@/api/client';
import type { AuthUser, RoleName } from '@/api/types';
import { sessionStore } from '@/lib/storage';

interface AuthState {
  user: AuthUser | null;
  login(email: string, password: string): Promise<AuthUser>;
  logout(): Promise<void>;
  hasRole(...roles: RoleName[]): boolean;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => sessionStore.get()?.user ?? null);
  const qc = useQueryClient();

  // The refresh interceptor emits this when the refresh token is no longer valid.
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      qc.clear();
    };
    window.addEventListener(SESSION_EXPIRED, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED, onExpired);
  }, [qc]);

  // Re-read role / employee link from the server in case an admin changed them.
  useEffect(() => {
    if (!sessionStore.get()) return;
    authApi
      .me()
      .then((me) => {
        const s = sessionStore.get();
        if (!s) return;
        const fresh: AuthUser = { id: me.id, email: me.email, role: me.role, employeeId: me.employee?.id ?? null };
        sessionStore.set({ ...s, user: fresh });
        setUser(fresh);
      })
      .catch(() => undefined);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await authApi.login(email, password);
    sessionStore.set({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: session.user });
    setUser(session.user);
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* token may already be invalid; sign out locally regardless */
    }
    sessionStore.clear();
    setUser(null);
    qc.clear();
  }, [qc]);

  const value = useMemo<AuthState>(
    () => ({ user, login, logout, hasRole: (...roles) => !!user && roles.includes(user.role) }),
    [user, login, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
