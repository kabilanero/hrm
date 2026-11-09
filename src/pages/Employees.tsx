import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { employeesApi } from '@/api/endpoints';
import type { Employee, ListParams } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useConfirm } from '@/components/Confirm';
import { Badge, Column, DataTable, ErrorBox, PageHeader, Pagination, Toolbar } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { useAction, useDebounced } from '@/lib/hooks';
import { useDepartments, useDesignations } from '@/lib/refdata';

export function EmployeesPage() {
  const { hasRole } = useAuth();
  const isHr = hasRole('ADMIN', 'HR');
  const confirm = useConfirm();
  const departments = useDepartments();
  const designations = useDesignations();

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [status, setStatus] = useState('true');
  const [sort, setSort] = useState('employeeName:asc');
  const q = useDebounced(search);

  const params: ListParams = {
    page, size, sort,
    ...(q ? { search: q } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(designationId ? { designationId } : {}),
    ...(status ? { isActive: status === 'true' } : {}),
  };
  const list = useQuery({ queryKey: ['employees', params], queryFn: () => employeesApi.list(params), placeholderData: (p) => p });
  const deactivate = useAction(employeesApi.deactivate, { success: 'Employee deactivated', invalidate: [['employees'], ['ref'], ['dashboard']] });

  const columns: Column<Employee>[] = [
    { key: 'code', header: 'Code', sortKey: 'employeeCode', render: (e) => <span className="mono">{e.employeeCode}</span> },
    { key: 'name', header: 'Name', sortKey: 'employeeName', render: (e) => (<><Link to={`/employees/${e.id}`}><strong>{e.employeeName}</strong></Link><div className="muted">{e.emailId}</div></>) },
    { key: 'dept', header: 'Department', sortKey: 'department.name', render: (e) => e.department?.name ?? '—' },
    { key: 'desig', header: 'Designation', sortKey: 'designation.name', render: (e) => e.designation?.name ?? '—' },
    { key: 'doj', header: 'Joined', sortKey: 'dateOfJoining', render: (e) => fmtDate(e.dateOfJoining) },
    { key: 'status', header: 'Status', render: (e) => <Badge value={e.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'actions', header: '', align: 'right', width: '210px',
      render: (e) => (
        <div className="row-actions">
          <Link className="btn btn-sm" to={`/employees/${e.id}`}>View</Link>
          {isHr && <Link className="btn btn-sm" to={`/employees/${e.id}/edit`}>Edit</Link>}
          {isHr && e.isActive && (
            <button
              className="btn btn-sm btn-danger" data-testid="deactivate"
              onClick={async () => {
                const c = await confirm({ title: 'Deactivate employee?', message: `${e.employeeName} will be marked inactive and their login disabled.`, confirmText: 'Deactivate', danger: true });
                if (c.ok) deactivate.mutate(e.id);
              }}
            >
              Deactivate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle={hasRole('MANAGER') ? 'Your direct reports.' : 'Everyone in the organisation.'}
        actions={isHr && <Link className="btn btn-primary" to="/employees/new" data-testid="add-employee">+ Add employee</Link>}
      />
      <Toolbar>
        <input className="grow" placeholder="Search name, code, email or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search employees" />
        <select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }} aria-label="Department">
          <option value="">All departments</option>
          {departments.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={designationId} onChange={(e) => { setDesignationId(e.target.value); setPage(1); }} aria-label="Designation">
          <option value="">All designations</option>
          {designations.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
          <option value="true">Active</option><option value="false">Inactive</option><option value="">All</option>
        </select>
      </Toolbar>
      {list.isError && <ErrorBox error={list.error} />}
      <DataTable columns={columns} rows={list.data?.items} loading={list.isLoading} sort={sort} onSort={setSort} testId="employee-table" empty="No employees match these filters" />
      <Pagination meta={list.data?.meta} onPage={setPage} onSize={(s) => { setSize(s); setPage(1); }} />
    </>
  );
}
