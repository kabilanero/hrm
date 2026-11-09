import { useQuery } from '@tanstack/react-query';
import { employeesApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { ErrorBox, PageHeader, Spinner } from '@/components/ui';
import { EmployeeProfileView } from './EmployeeDetail';

/** The signed-in user's own employee record, resolved through GET /employees/me. */
export function MyProfilePage() {
  const { user } = useAuth();
  const me = useQuery({ queryKey: ['employee-me'], queryFn: employeesApi.me, enabled: !!user?.employeeId });
  if (!user?.employeeId) {
    return (
      <>
        <PageHeader title="My profile" />
        <div className="card empty">
          <h3>No employee record linked</h3>
          <p className="muted">Your login ({user?.email}) is not linked to an employee. An administrator can link it from User accounts.</p>
        </div>
      </>
    );
  }
  if (me.isLoading) return <Spinner />;
  if (me.isError) return <ErrorBox error={me.error} />;
  return <EmployeeProfileView employeeId={me.data!.id} />;
}
