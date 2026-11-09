import { useQuery } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { employeesApi } from '@/api/endpoints';
import { Checkbox, ErrorBox, Input, PageHeader, Select, Spinner } from '@/components/ui';
import { dateOnly } from '@/lib/format';
import { useAction } from '@/lib/hooks';
import { useBloodGroups, useBranches, useDepartments, useDesignations, useEmployeeOptions, useShifts } from '@/lib/refdata';

type F = {
  employeeCode: string; employeeName: string; fatherName: string; gender: string; maritalStatus: string; dateOfBirth: string;
  bloodGroupId: string; highestQualification: string; emailId: string; secondaryEmailId: string; contactNumber: string;
  alterMobileNumber: string; emergencyContactNumber: string; dateOfJoining: string; dateOfResign: string;
  departmentId: string; designationId: string; defaultBranchId: string; workShiftId: string; reportsToId: string;
  basicPay: string; pfUANNo: string; esiRefNo: string; isDepartmentHead: boolean; isTravelTrackable: boolean; branchIds: string[];
};
const EMPTY: F = {
  employeeCode: '', employeeName: '', fatherName: '', gender: '', maritalStatus: '', dateOfBirth: '', bloodGroupId: '',
  highestQualification: '', emailId: '', secondaryEmailId: '', contactNumber: '', alterMobileNumber: '', emergencyContactNumber: '',
  dateOfJoining: '', dateOfResign: '', departmentId: '', designationId: '', defaultBranchId: '', workShiftId: '', reportsToId: '',
  basicPay: '', pfUANNo: '', esiRefNo: '', isDepartmentHead: false, isTravelTrackable: false, branchIds: [],
};
const GENDERS = ['MALE', 'FEMALE', 'OTHER'].map((v) => ({ value: v, label: v[0] + v.slice(1).toLowerCase() }));
const MARITAL = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'].map((v) => ({ value: v, label: v[0] + v.slice(1).toLowerCase() }));
const TEXT_KEYS = ['fatherName', 'highestQualification', 'secondaryEmailId', 'contactNumber', 'alterMobileNumber', 'emergencyContactNumber', 'pfUANNo', 'esiRefNo'] as const;
const ID_KEYS = ['bloodGroupId', 'departmentId', 'designationId', 'defaultBranchId', 'workShiftId', 'reportsToId'] as const;

export function EmployeeFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [f, setF] = useState<F>(EMPTY);
  const [formError, setFormError] = useState('');
  const set = <K extends keyof F>(k: K, v: F[K]) => setF((s) => ({ ...s, [k]: v }));

  const existing = useQuery({ queryKey: ['employee', id], queryFn: () => employeesApi.get(id!), enabled: editing });
  const departments = useDepartments();
  const designations = useDesignations();
  const branches = useBranches();
  const shifts = useShifts();
  const blood = useBloodGroups();
  const people = useEmployeeOptions();

  useEffect(() => {
    const e = existing.data;
    if (!e) return;
    setF({
      employeeCode: e.employeeCode, employeeName: e.employeeName, fatherName: e.fatherName ?? '', gender: e.gender ?? '',
      maritalStatus: e.maritalStatus ?? '', dateOfBirth: dateOnly(e.dateOfBirth), bloodGroupId: e.bloodGroupId ?? '',
      highestQualification: e.highestQualification ?? '', emailId: e.emailId, secondaryEmailId: e.secondaryEmailId ?? '',
      contactNumber: e.contactNumber ?? '', alterMobileNumber: e.alterMobileNumber ?? '', emergencyContactNumber: e.emergencyContactNumber ?? '',
      dateOfJoining: dateOnly(e.dateOfJoining), dateOfResign: dateOnly(e.dateOfResign), departmentId: e.departmentId ?? '',
      designationId: e.designationId ?? '', defaultBranchId: e.defaultBranchId ?? '', workShiftId: e.workShiftId ?? '',
      reportsToId: e.reportsToId ?? '', basicPay: e.basicPay != null ? String(Number(e.basicPay)) : '', pfUANNo: e.pfUANNo ?? '',
      esiRefNo: e.esiRefNo ?? '', isDepartmentHead: e.isDepartmentHead, isTravelTrackable: e.isTravelTrackable,
      branchIds: e.branches?.map((b) => b.id) ?? [],
    });
  }, [existing.data]);

  const save = useAction(
    (body: object) => (editing ? employeesApi.update(id!, body) : employeesApi.create(body)),
    {
      success: editing ? 'Employee updated' : 'Employee created',
      invalidate: [['employees'], ['employee'], ['ref'], ['dashboard']],
      onSuccess: (e) => navigate(`/employees/${e.id}`),
    },
  );

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    setFormError('');
    if (f.dateOfResign && f.dateOfResign < f.dateOfJoining) return setFormError('Resignation date cannot be before the joining date.');
    const body: Record<string, unknown> = {
      employeeCode: f.employeeCode.trim(), employeeName: f.employeeName.trim(), emailId: f.emailId.trim(),
      dateOfJoining: f.dateOfJoining, isDepartmentHead: f.isDepartmentHead, isTravelTrackable: f.isTravelTrackable, branchIds: f.branchIds,
    };
    // Optional fields: omit when empty on create; send null on edit so a cleared value is actually cleared.
    const blank = editing ? null : undefined;
    for (const k of TEXT_KEYS) body[k] = f[k].trim() || blank;
    for (const k of ID_KEYS) body[k] = f[k] || blank;
    body.basicPay = f.basicPay === '' ? blank : Number(f.basicPay);
    for (const k of ['gender', 'maritalStatus'] as const) if (f[k]) body[k] = f[k]; else if (editing) body[k] = null;
    for (const k of ['dateOfBirth', 'dateOfResign'] as const) if (f[k]) body[k] = f[k];
    for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
    save.mutate(body);
  };

  if (editing && existing.isLoading) return <Spinner />;
  if (editing && existing.isError) return <ErrorBox error={existing.error} />;

  const toggleBranch = (bid: string) => set('branchIds', f.branchIds.includes(bid) ? f.branchIds.filter((x) => x !== bid) : [...f.branchIds, bid]);

  return (
    <>
      <PageHeader title={editing ? `Edit ${existing.data?.employeeName ?? 'employee'}` : 'Add employee'} subtitle="Fields marked * are required." />
      <form onSubmit={submit} data-testid="employee-form">
        {formError && <div className="alert alert-error" role="alert">{formError}</div>}
        <fieldset>
          <legend>Personal</legend>
          <div className="form-grid">
            <Input label="Employee code" name="employeeCode" value={f.employeeCode} onChange={(v) => set('employeeCode', v)} required />
            <Input label="Full name" name="employeeName" value={f.employeeName} onChange={(v) => set('employeeName', v)} required />
            <Input label="Father's name" name="fatherName" value={f.fatherName} onChange={(v) => set('fatherName', v)} />
            <Input label="Date of birth" name="dateOfBirth" type="date" value={f.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} />
            <Select label="Gender" name="gender" value={f.gender} onChange={(v) => set('gender', v)} options={GENDERS} />
            <Select label="Marital status" name="maritalStatus" value={f.maritalStatus} onChange={(v) => set('maritalStatus', v)} options={MARITAL} />
            <Select label="Blood group" name="bloodGroupId" value={f.bloodGroupId} onChange={(v) => set('bloodGroupId', v)} options={blood.options} />
            <Input label="Highest qualification" name="highestQualification" value={f.highestQualification} onChange={(v) => set('highestQualification', v)} />
          </div>
        </fieldset>
        <fieldset>
          <legend>Contact</legend>
          <div className="form-grid">
            <Input label="Work email" name="emailId" type="email" value={f.emailId} onChange={(v) => set('emailId', v)} required />
            <Input label="Secondary email" name="secondaryEmailId" type="email" value={f.secondaryEmailId} onChange={(v) => set('secondaryEmailId', v)} />
            <Input label="Mobile" name="contactNumber" value={f.contactNumber} onChange={(v) => set('contactNumber', v)} hint="e.g. +91 98765 43210" />
            <Input label="Alternate mobile" name="alterMobileNumber" value={f.alterMobileNumber} onChange={(v) => set('alterMobileNumber', v)} />
            <Input label="Emergency contact" name="emergencyContactNumber" value={f.emergencyContactNumber} onChange={(v) => set('emergencyContactNumber', v)} />
          </div>
        </fieldset>
        <fieldset>
          <legend>Employment</legend>
          <div className="form-grid">
            <Input label="Date of joining" name="dateOfJoining" type="date" value={f.dateOfJoining} onChange={(v) => set('dateOfJoining', v)} required />
            <Input label="Date of resignation" name="dateOfResign" type="date" value={f.dateOfResign} onChange={(v) => set('dateOfResign', v)} />
            <Select label="Department" name="departmentId" value={f.departmentId} onChange={(v) => set('departmentId', v)} options={departments.options} />
            <Select label="Designation" name="designationId" value={f.designationId} onChange={(v) => set('designationId', v)} options={designations.options} />
            <Select label="Default branch" name="defaultBranchId" value={f.defaultBranchId} onChange={(v) => set('defaultBranchId', v)} options={branches.options} />
            <Select label="Work shift" name="workShiftId" value={f.workShiftId} onChange={(v) => set('workShiftId', v)} options={shifts.options} />
            <Select label="Reports to" name="reportsToId" value={f.reportsToId} onChange={(v) => set('reportsToId', v)} options={people.options.filter((o) => o.value !== id)} />
            <Input label="Basic pay" name="basicPay" type="number" min={0} step="0.01" value={f.basicPay} onChange={(v) => set('basicPay', v)} />
            <div className="span2">
              <div className="field"><span>Branches the employee can work at</span></div>
              <div className="checks">
                {branches.options.length === 0 && <span className="muted">No branches yet. Add some under Master data → Branches.</span>}
                {branches.options.map((b) => <Checkbox key={b.value} label={b.label} checked={f.branchIds.includes(b.value)} onChange={() => toggleBranch(b.value)} />)}
              </div>
            </div>
            <Checkbox label="Department head" checked={f.isDepartmentHead} onChange={(v) => set('isDepartmentHead', v)} />
            <Checkbox label="Travel trackable" checked={f.isTravelTrackable} onChange={(v) => set('isTravelTrackable', v)} />
          </div>
        </fieldset>
        <fieldset>
          <legend>Statutory</legend>
          <div className="form-grid">
            <Input label="PF UAN number" name="pfUANNo" value={f.pfUANNo} onChange={(v) => set('pfUANNo', v)} />
            <Input label="ESI reference" name="esiRefNo" value={f.esiRefNo} onChange={(v) => set('esiRefNo', v)} />
          </div>
        </fieldset>
        <div className="page-actions">
          <button className="btn btn-primary" type="submit" disabled={save.isPending} data-testid="save-employee">{save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create employee'}</button>
          <button className="btn" type="button" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </>
  );
}
