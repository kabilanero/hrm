import { QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { ApiError } from '@/api/client';

/** Mutation that toasts success/failure and invalidates the given query keys. */
export function useAction<A, R>(
  fn: (arg: A) => Promise<R>,
  opts: { success?: string | ((r: R) => string); invalidate?: QueryKey[]; onSuccess?(r: R, arg: A): void } = {},
) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation<R, ApiError, A>({
    mutationFn: fn,
    onSuccess: async (r, arg) => {
      if (opts.success) toast.success(typeof opts.success === 'function' ? opts.success(r) : opts.success);
      await Promise.all((opts.invalidate ?? []).map((k) => qc.invalidateQueries({ queryKey: k })));
      opts.onSuccess?.(r, arg);
    },
    onError: (e) => toast.error(e.full),
  });
}

/** Debounces fast-changing input (search boxes). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
