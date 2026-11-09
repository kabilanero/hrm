export type RoleName = 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEK_OFF';

export interface AuthUser {
  id: string;
  email: string;
  role: RoleName;
  employeeId: string | null;
}
export interface Session {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}
export interface PageMeta {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
export interface Page<T> {
  items: T[];
  meta: PageMeta;
}
export interface ListParams {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

interface Base {
  id: string;
  createdAt: string;
  updatedAt?: string;
}
export interface Department extends Base { name: string; description?: string | null; isActive: boolean }
export interface Designation extends Base { name: string; description?: string | null; level: number; isActive: boolean }
export interface Branch extends Base {
  code: string; name: string; email?: string | null; phone?: string | null; addressLine?: string | null;
  city?: string | null; state?: string | null; country?: string | null; pincode?: string | null; isActive: boolean;
}
export interface WorkShift extends Base { name: string; startTime: string; endTime: string; durationMin: number; graceMin: number; isActive: boolean }
export interface LeaveType extends Base { code: string; name: string; maxDaysYear: number; isPaid: boolean; isActive: boolean }
export interface Holiday extends Base { name: string; date: string; year: number; isActive: boolean }
export interface BloodGroup { id: string; name: string; createdAt: string }

export interface Ref { id: string; name: string }
export interface Employee extends Base {
  employeeCode: string;
  employeeName: string;
  fatherName?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | null;
  dateOfBirth?: string | null;
  highestQualification?: string | null;
  emailId: string;
  secondaryEmailId?: string | null;
  contactNumber?: string | null;
  alterMobileNumber?: string | null;
  emergencyContactNumber?: string | null;
  profileImagePath?: string | null;
  dateOfJoining: string;
  dateOfResign?: string | null;
  isDepartmentHead: boolean;
  isTravelTrackable: boolean;
  basicPay?: string | number | null;
  pfUANNo?: string | null;
  esiRefNo?: string | null;
  isActive: boolean;
  departmentId?: string | null;
  designationId?: string | null;
  defaultBranchId?: string | null;
  workShiftId?: string | null;
  reportsToId?: string | null;
  bloodGroupId?: string | null;
  department?: Ref | null;
  designation?: Ref | null;
  defaultBranch?: { id: string; name: string; code: string } | null;
  workShift?: { id: string; name: string; startTime: string; endTime: string } | null;
  bloodGroup?: Ref | null;
  reportsTo?: { id: string; employeeName: string; employeeCode: string } | null;
  branches?: { id: string; name: string; code: string }[];
}
export interface EmployeeAddress extends Base {
  employeeId: string; type: 'CURRENT' | 'PERMANENT'; addressLine: string;
  city?: string | null; district?: string | null; state?: string | null; country?: string | null; pincode?: string | null;
}
export interface BankAccount extends Base {
  employeeId: string; bankName: string; accountNumber: string; ifscCode: string; isPrimary: boolean;
}
export interface Reportee { id: string; employeeCode: string; employeeName: string; designation?: { name: string } | null }

export interface Leave extends Base {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  noOfDays: string | number;
  reason: string;
  status: LeaveStatus;
  approverId?: string | null;
  approvedAt?: string | null;
  remarks?: string | null;
  leaveType: { id: string; code: string; name: string };
  employee: { id: string; employeeCode: string; employeeName: string };
  approver?: { id: string; employeeName: string } | null;
}
export interface LeaveBalance {
  leaveTypeId: string; code: string; name: string; year: number;
  entitled: number; used: number; pending: number; remaining: number | null;
}

export interface Attendance {
  id?: string;
  employeeId: string;
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  workedMinutes?: number;
  status?: AttendanceStatus;
  remarks?: string | null;
  employee?: { id: string; employeeCode: string; employeeName: string };
}
export interface MonthlyDay {
  date: string;
  status: AttendanceStatus | null;
  punchIn: string | null;
  punchOut: string | null;
  workedMinutes: number;
  holiday: string | null;
}
export interface MonthlyAttendance {
  employeeId: string;
  year: number;
  month: number;
  summary: { present: number; halfDay: number; absent: number; onLeave: number; holidays: number; weekOffs: number; workedMinutes: number };
  days: MonthlyDay[];
}

export interface UserAccount {
  id: string; email: string; role: RoleName; employeeId: string | null;
  isActive: boolean; lastLoginAt: string | null; createdAt: string;
}
export interface RoleRow { id: string; name: RoleName; description?: string | null }
export interface MeResponse {
  id: string; email: string; role: RoleName; lastLoginAt: string | null;
  employee: (Employee & { department?: Ref | null; designation?: Ref | null }) | null;
}
export interface DashboardSummary {
  employees: { active: number; inactive: number; total: number };
  today: { date: string; present: number; onLeave: number };
  pendingLeaves: number;
  byDepartment: { departmentId: string | null; name: string; count: number }[];
  byDesignation: { designationId: string | null; name: string; count: number }[];
  byGender: { gender: string; count: number }[];
  upcomingHolidays: { id: string; name: string; date: string }[];
}
