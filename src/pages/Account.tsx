import { useQuery } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { authApi } from '@/api/endpoints';
import { ErrorBox, Input, PageHeader, Spinner, Badge } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';
import { useAction } from '@/lib/hooks';

export function AccountPage() {
  const me = useQuery({ queryKey: ['me'], queryFn: authApi.me });
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const change = useAction((a: { c: string; n: string }) => authApi.changePassword(a.c, a.n), {
    success: 'Password updated', onSuccess: () => { setCur(''); setNext(''); setAgain(''); },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (next !== again) return setError('New passwords do not match');
    setError('');
    change.mutate({ c: cur, n: next });
  };
  return (
    <>
      <PageHeader title="Account & security" />
      {me.isLoading && <Spinner />}
      {me.isError && <ErrorBox error={me.error} />}
      <div className="grid g2">
        {me.data && (
          <div className="card" data-testid="account-card">
            <h3>Signed in</h3>
            <dl className="kv">
              <dt>Email</dt><dd>{me.data.email}</dd>
              <dt>Role</dt><dd><Badge value={me.data.role} /></dd>
              <dt>Employee</dt><dd>{me.data.employee ? `${me.data.employee.employeeName} (${me.data.employee.employeeCode})` : 'Not linked'}</dd>
              <dt>Last login</dt><dd>{fmtDateTime(me.data.lastLoginAt)}</dd>
            </dl>
          </div>
        )}
        <form className="card" onSubmit={submit} data-testid="password-form">
          <h3>Change password</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <Input label="Current password" type="password" name="current" value={cur} onChange={setCur} required autoComplete="current-password" />
          <Input label="New password" type="password" name="new" value={next} onChange={setNext} required autoComplete="new-password" hint="8–72 chars with upper-case, lower-case and a digit" />
          <Input label="Repeat new password" type="password" name="again" value={again} onChange={setAgain} required autoComplete="new-password" />
          <button className="btn btn-primary" type="submit" disabled={change.isPending}>Update password</button>
        </form>
      </div>
    </>
  );
}
