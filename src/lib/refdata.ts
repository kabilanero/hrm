import { useQuery } from '@tanstack/react-query';
import {
  bloodGroupsApi, branchesApi, departmentsApi, designationsApi, employeesApi, leaveTypesApi, workShiftsApi,
} from '@/api/endpoints';
import type { Option } from '@/components/ui';

const STALE = 60_000;
const opts = <T,>(rows: T[] | undefined, f: (r: T) => Option): Option[] => (rows ?? []).map(f);

export const useDepartments = () => {
  const q = useQuery({ queryKey: ['ref', 'departments'], queryFn: departmentsApi.all, staleTime: STALE });
  return { ...q, options: opts(q.data, (d) => ({ value: d.id, label: d.name })) };
};
export const useDesignations = () => {
  const q = useQuery({ queryKey: ['ref', 'designations'], queryFn: designationsApi.all, staleTime: STALE });
  return { ...q, options: opts(q.data, (d) => ({ value: d.id, label: d.name })) };
};
export const useBranches = () => {
  const q = useQuery({ queryKey: ['ref', 'branches'], queryFn: branchesApi.all, staleTime: STALE });
  return { ...q, options: opts(q.data, (d) => ({ value: d.id, label: `${d.name} (${d.code})` })) };
};
export const useShifts = () => {
  const q = useQuery({ queryKey: ['ref', 'shifts'], queryFn: workShiftsApi.all, staleTime: STALE });
  return { ...q, options: opts(q.data, (d) => ({ value: d.id, label: `${d.name} ${d.startTime}–${d.endTime}` })) };
};
export const useBloodGroups = () => {
  const q = useQuery({ queryKey: ['ref', 'blood'], queryFn: bloodGroupsApi.all, staleTime: STALE });
  return { ...q, options: opts(q.data, (d) => ({ value: d.id, label: d.name })) };
};
export const useLeaveTypes = () => {
  const q = useQuery({ queryKey: ['ref', 'leave-types'], queryFn: leaveTypesApi.all, staleTime: STALE });
  return { ...q, options: opts(q.data?.filter((l) => l.isActive), (d) => ({ value: d.id, label: `${d.name} (${d.code})` })) };
};
/** Up to 100 employees for pickers (the API caps page size at 100). Only HR/Admin/Manager may list. */
export const useEmployeeOptions = (enabled = true) => {
  const q = useQuery({
    queryKey: ['ref', 'employees'],
    queryFn: () => employeesApi.list({ page: 1, size: 100, sort: 'employeeName:asc' }),
    staleTime: STALE,
    enabled,
  });
  return { ...q, options: opts(q.data?.items, (e) => ({ value: e.id, label: `${e.employeeName} (${e.employeeCode})` })) };
};
