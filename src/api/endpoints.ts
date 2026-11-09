import { del, get, getPage, http, patch, post, put } from './client';
import type {
  Attendance, AuthUser, BankAccount, BloodGroup, Branch, DashboardSummary, Department, Designation, Employee,
  EmployeeAddress, Holiday, Leave, LeaveBalance, LeaveType, ListParams, MeResponse, MonthlyAttendance, Reportee,
  RoleRow, Session, UserAccount, WorkShift,
} from './types';

/* ───────── auth ───────── */
export const authApi = {
  login: (email: string, password: string) => post<Session>('/auth/login', { email, password }),
  register: (email: string, password: string) => post<AuthUser>('/auth/register', { email, password }),
  forgotPassword: (email: string) => post<{ message: string }>('/auth/forgot-password', { email }),
  logout: () => post<{ loggedOut: boolean }>('/auth/logout'),
  me: () => get<MeResponse>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    post<{ message: string }>('/auth/change-password', { currentPassword, newPassword }),
};

/* ───────── health (not enveloped) ───────── */
export const healthApi = {
  ready: async () => (await http.get<{ status: string }>('/health/ready')).data.status === 'ok',
};

/* ───────── generic master-data resource ───────── */
export function resource<T extends { id: string }>(path: string) {
  return {
    list: (params?: ListParams) => getPage<T>(path, params),
    all: () => get<T[]>(`${path}/all`),
    get: (id: string) => get<T>(`${path}/${id}`),
    create: (body: object) => post<T>(path, body),
    update: (id: string, body: object) => patch<T>(`${path}/${id}`, body),
    remove: (id: string) => del(`${path}/${id}`),
  };
}
export const departmentsApi = resource<Department>('/departments');
export const designationsApi = resource<Designation>('/designations');
export const branchesApi = resource<Branch>('/branches');
export const workShiftsApi = resource<WorkShift>('/work-shifts');
export const leaveTypesApi = resource<LeaveType>('/leave-types');
export const holidaysApi = resource<Holiday>('/holidays');
export const bloodGroupsApi = resource<BloodGroup>('/blood-groups');

/* ───────── employees ───────── */
export const employeesApi = {
  list: (params?: ListParams) => getPage<Employee>('/employees', params),
  me: () => get<Employee>('/employees/me'),
  get: (id: string) => get<Employee>(`/employees/${id}`),
  create: (body: object) => post<Employee>('/employees', body),
  update: (id: string, body: object) => patch<Employee>(`/employees/${id}`, body),
  deactivate: (id: string) => del<{ id: string; isActive: boolean }>(`/employees/${id}`),
  reportees: (id: string) => get<Reportee[]>(`/employees/${id}/reportees`),
  uploadImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return post<{ profileImagePath: string; url: string | null }>(`/employees/${id}/profile-image`, form);
  },
  imageUrl: (id: string) => get<{ url: string | null }>(`/employees/${id}/profile-image`),

  addresses: (id: string) => get<EmployeeAddress[]>(`/employees/${id}/addresses`),
  addAddress: (id: string, body: object) => post<EmployeeAddress>(`/employees/${id}/addresses`, body),
  updateAddress: (id: string, addrId: string, body: object) => patch<EmployeeAddress>(`/employees/${id}/addresses/${addrId}`, body),
  removeAddress: (id: string, addrId: string) => del(`/employees/${id}/addresses/${addrId}`),

  bankAccounts: (id: string) => get<BankAccount[]>(`/employees/${id}/bank-accounts`),
  addBank: (id: string, body: object) => post<BankAccount>(`/employees/${id}/bank-accounts`, body),
  updateBank: (id: string, bankId: string, body: object) => patch<BankAccount>(`/employees/${id}/bank-accounts/${bankId}`, body),
  removeBank: (id: string, bankId: string) => del(`/employees/${id}/bank-accounts/${bankId}`),
};

/* ───────── leaves ───────── */
export const leavesApi = {
  list: (params?: ListParams) => getPage<Leave>('/leaves', params),
  get: (id: string) => get<Leave>(`/leaves/${id}`),
  apply: (body: object) => post<Leave>('/leaves', body),
  balance: (params: { employeeId?: string; year?: number }) => get<LeaveBalance[]>('/leaves/balance', params),
  decide: (id: string, status: 'APPROVED' | 'REJECTED', remarks?: string) =>
    patch<Leave>(`/leaves/${id}/decision`, { status, ...(remarks ? { remarks } : {}) }),
  revoke: (id: string) => patch<Leave>(`/leaves/${id}/revoke`),
  cancel: (id: string) => patch<Leave>(`/leaves/${id}/cancel`),
};

/* ───────── attendance ───────── */
export const attendanceApi = {
  punchIn: () => post<Attendance>('/attendance/punch-in'),
  punchOut: () => post<Attendance>('/attendance/punch-out'),
  today: () => get<Attendance>('/attendance/today'),
  monthly: (params: { year: number; month: number; employeeId?: string }) => get<MonthlyAttendance>('/attendance/monthly', params),
  list: (params?: ListParams) => getPage<Attendance>('/attendance', params),
  upsert: (body: object) => put<Attendance>('/attendance', body),
};

/* ───────── users & dashboard ───────── */
export const usersApi = {
  list: (params?: ListParams) => getPage<UserAccount>('/users', params),
  roles: () => get<RoleRow[]>('/users/roles'),
  create: (body: object) => post<UserAccount>('/users', body),
  update: (id: string, body: object) => patch<UserAccount>(`/users/${id}`, body),
  remove: (id: string) => del(`/users/${id}`),
};
export const dashboardApi = { summary: () => get<DashboardSummary>('/dashboard/summary') };
