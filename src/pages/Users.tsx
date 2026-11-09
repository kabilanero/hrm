import { useQuery } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { usersApi } from '@/api/endpoints';
import type { ListParams, RoleName, UserAccount } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useConfirm } from '@/components/Confirm';
import { Badge, Checkbox, Column, DataTable, ErrorBox, Input, Modal, PageHeader, Pagination, Select, Toolbar } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';
import { useAction, useDebounced } from '@/lib/hooks';
import { useEmployeeOptions } from '@/lib/refdata';

export function UsersPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const people = useEmployeeOptions();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  const [editing, setEditing] = useState<{ row?: UserAccount } | null>(null);
  const q = useDebounced(search);
  const params: ListParams = { page, size, ...(q ? { search: q } : {}), ...(sort ? { sort } : {}) };
  const list = useQuery({ queryKey: ['users', params], queryFn: () => usersApi.list(params), placeholderData: (p) => p });
  const remove = useAction(usersApi.remove, { success: 'User deleted', invalidate: [['users']] });
  const who = new Map(people.options.map((o) => [o.value, o.label]));

  const columns: Column<UserAccount>[] = [
    { key: 'email', header: 'Email', sortKey: 'email', render: (u) => <strong>{u.email}</strong> },
    { key: 'role', header: 'Role', render: (u) => <Badge value={u.role} /> },
    { key: 'emp', header: 'Employee', render: (u) => (u.employeeId ? who.get(u.employeeId) ?? u.employeeId.slice(0, 8) : <span className="muted">Not linked</span>) },
    { key: 'status', header: 'Status', render: (u) => <Badge value={u.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
    { key: 'last', header: 'Last login', sortKey: 'lastLoginAt', render: (u) => fmtDateTime(u.lastLoginAt) },
    {
      key: 'actions', header: '', align: 'right', width: '160px',
      render: (u) => (
        <div className="row-actions">
          <button className="btn btn-sm" onClick={() => setEditing({ row: u })} data-testid="edit-row">Edit</button>
          {u.id !== user?.id && (
            <button className="btn btn-sm btn-danger" data-testid="delete-row" onClick={async () => { if ((await confirm({ title: 'Delete user?', message: `${u.email} will lose access permanently.`, confirmText: 'Delete', danger: true })).ok) remove.mutate(u.id); }}>Delete</button>
          )}
        </div>
      ),
    },
  ];
  return (
    <>
      <PageHeader title="User accounts" subtitle="Logins, roles and employee links. Only administrators can manage these." actions={<button className="btn btn-primary" onClick={() => setEditing({})} data-testid="add-user">+ Add user</button>} />
      <Toolbar><input className="grow" placeholder="Search email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search users" /></Toolbar>
      {list.isError && <ErrorBox error={list.error} />}
      <DataTable columns={columns} rows={list.data?.items} loading={list.isLoading} sort={sort} onSort={setSort} testId="user-table" />
      <Pagination meta={list.data?.meta} onPage={setPage} onSize={(s) => { setSize(s); setPage(1); }} />
      {editing && <UserForm row={editing.row} people={people.options} onClose={() => setEditing(null)} />}
    </>
  );
}

function UserForm({ row, people, onClose }: { row?: UserAccount; people: { value: string; label: string }[]; onClose(): void }) {
  const roles = useQuery({ queryKey: ['roles'], queryFn: usersApi.roles, staleTime: 60_000 });
  const [v, setV] = useState({ email: row?.email ?? '', password: '', role: (row?.role ?? 'EMPLOYEE') as RoleName, employeeId: row?.employeeId ?? '', isActive: row?.isActive ?? true });
  const save = useAction((b: object) => (row ? usersApi.update(row.id, b) : usersApi.create(b)), { success: row ? 'User updated' : 'User created', invalidate: [['users']], onSuccess: onClose });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(row ? { role: v.role, isActive: v.isActive, ...(v.employeeId ? { employeeId: v.employeeId } : {}) } : { email: v.email.trim(), password: v.password, role: v.role, ...(v.employeeId ? { employeeId: v.employeeId } : {}) });
  };
  return (
    <Modal title={row ? `Edit ${row.email}` : 'Add user'} onClose={onClose} footer={<><button className="btn" onClick={onClose} type="button">Cancel</button><button className="btn btn-primary" form="user-form" type="submit" disabled={save.isPending} data-testid="save">Save</button></>}>
      <form id="user-form" onSubmit={submit}>
        {!row && (<>
          <Input label="Email" name="email" type="email" value={v.email} onChange={(x) => setV((p) => ({ ...p, email: x }))} required />
          <Input label="Password" name="password" type="text" value={v.password} onChange={(x) => setV((p) => ({ ...p, password: x }))} required hint="8–72 chars with upper-case, lower-case and a digit" />
        </>)}
        <Select label="Role" name="role" value={v.role} onChange={(x) => setV((p) => ({ ...p, role: x as RoleName }))} options={(roles.data ?? []).map((r) => ({ value: r.name, label: r.name }))} required />
        <Select label="Linked employee" name="employeeId" value={v.employeeId} onChange={(x) => setV((p) => ({ ...p, employeeId: x }))} options={people} hint="Needed for punching, leave and self-service." />
        {row && <Checkbox label="Account active" checked={v.isActive} onChange={(x) => setV((p) => ({ ...p, isActive: x }))} />}
      </form>
    </Modal>
  );
}
