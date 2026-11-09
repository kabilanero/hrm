const KEY = 'hrm.session.v1';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: import('@/api/types').AuthUser;
}

export const sessionStore = {
  get(): StoredSession | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      return null;
    }
  },
  set(s: StoredSession) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage unavailable: session lives in memory only */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};
