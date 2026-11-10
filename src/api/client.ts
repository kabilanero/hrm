import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { sessionStore } from '@/lib/storage';
import type { Page, PageMeta, Session } from './types';

const baseURL ='https://unfulminating-amicably-sha.ngrok-free.dev/api/v1'; 

export const http = axios.create({ baseURL, timeout: 30_000 });

/** Normalised error thrown by every API call. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details: string[] = [],
  ) {
    super(message);
  }
  /** message plus per-field validation errors, ready to show to a user */
  get full() {
    return this.details.length ? `${this.message}: ${this.details.join('; ')}` : this.message;
  }
}

/** Emitted when the session can no longer be refreshed so the UI can route to /login. */
export const SESSION_EXPIRED = 'hrm:session-expired';

http.interceptors.request.use((config) => {
  const s = sessionStore.get();
  if (s?.accessToken) config.headers.set('Authorization', `Bearer ${s.accessToken}`);
  return config;
});

let refreshing: Promise<string | null> | null = null;

/** Single-flight refresh: concurrent 401s share one refresh request. */
async function refreshAccessToken(): Promise<string | null> {
  const current = sessionStore.get();
  if (!current?.refreshToken) return null;
  try {
    const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken: current.refreshToken });
    const session = res.data.data as Session;
    sessionStore.set({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: session.user });
    return session.accessToken;
  } catch {
    return null;
  }
}

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<{ message?: string; errors?: string[] }>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = original?.url?.startsWith('/auth/login') || original?.url?.startsWith('/auth/refresh');

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall && sessionStore.get()) {
      original._retried = true;
      refreshing ??= refreshAccessToken().finally(() => (refreshing = null));
      const token = await refreshing;
      if (token) {
        original.headers.set('Authorization', `Bearer ${token}`);
        return http(original);
      }
      sessionStore.clear();
      window.dispatchEvent(new Event(SESSION_EXPIRED));
    }

    const body = error.response?.data;
    throw new ApiError(
      body?.message ?? (error.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is the API running?' : error.message),
      error.response?.status ?? 0,
      body?.errors ?? [],
    );
  },
);

/* ---- envelope helpers: the API wraps everything in { success, data, meta? } ---- */
export async function get<T>(url: string, params?: object, config?: AxiosRequestConfig): Promise<T> {
  return (await http.get(url, { params, ...config })).data.data as T;
}
export async function getPage<T>(url: string, params?: object): Promise<Page<T>> {
  const body = (await http.get(url, { params })).data as { data: T[]; meta: PageMeta };
  return { items: body.data, meta: body.meta };
}
export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return (await http.post(url, data, config)).data.data as T;
}
export async function patch<T>(url: string, data?: unknown): Promise<T> {
  return (await http.patch(url, data)).data.data as T;
}
export async function put<T>(url: string, data?: unknown): Promise<T> {
  return (await http.put(url, data)).data.data as T;
}
export async function del<T = { id: string; deleted: boolean }>(url: string): Promise<T> {
  return (await http.delete(url)).data.data as T;
}