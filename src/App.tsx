import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, RequireRole } from '@/auth/guards';
import { Layout } from '@/components/Layout';
import { AccountPage } from '@/pages/Account';
import { AttendancePage } from '@/pages/Attendance';
import { DashboardPage } from '@/pages/Dashboard';
import { EmployeeDetailPage } from '@/pages/EmployeeDetail';
import { EmployeeFormPage } from '@/pages/EmployeeForm';
import { EmployeesPage } from '@/pages/Employees';
import { LeavesPage } from '@/pages/Leaves';
import { LoginPage, RegisterPage } from '@/pages/Login';
import { MASTERS, MasterPage } from '@/pages/MasterPage';
import { MyProfilePage } from '@/pages/MyProfile';
import { UsersPage } from '@/pages/Users';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="profile" element={<MyProfilePage />} />
        <Route path="leaves" element={<LeavesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="employees" element={<RequireRole roles={['ADMIN', 'HR', 'MANAGER']}><EmployeesPage /></RequireRole>} />
        <Route path="employees/new" element={<RequireRole roles={['ADMIN', 'HR']}><EmployeeFormPage /></RequireRole>} />
        <Route path="employees/:id" element={<RequireRole roles={['ADMIN', 'HR', 'MANAGER']}><EmployeeDetailPage /></RequireRole>} />
        <Route path="employees/:id/edit" element={<RequireRole roles={['ADMIN', 'HR']}><EmployeeFormPage /></RequireRole>} />
        {Object.keys(MASTERS).map((k) => (
          <Route key={k} path={`master/${k}`} element={<RequireRole roles={['ADMIN', 'HR']}><MasterPage config={MASTERS[k]} /></RequireRole>} />
        ))}
        <Route path="users" element={<RequireRole roles={['ADMIN']}><UsersPage /></RequireRole>} />
        <Route path="account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
