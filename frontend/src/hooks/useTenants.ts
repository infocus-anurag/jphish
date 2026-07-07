import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  archiveTenant,
  assignPlan,
  changeTenantStatus,
  createTenant,
  getEntitlements,
  getTenantUsage,
  listPlans,
  listTenants,
  resetTenantUsage,
  setTenantFeatures,
  updateTenant,
  type CreateTenantInput,
  type TenantFeature,
  type TenantStatus,
  type UpdateTenantInput,
  type UsageMetric,
} from '@/lib/api/tenants';

const TENANTS_KEY = ['tenants'] as const;
const PLANS_KEY = ['plans'] as const;
const entitlementsKey = (id: string) => ['tenant', id, 'entitlements'] as const;
const usageKey = (id: string) => ['tenant', id, 'usage'] as const;

export function useTenantsQuery(status?: TenantStatus) {
  return useQuery({
    queryKey: [...TENANTS_KEY, status ?? 'all'],
    queryFn: () => listTenants(status ? { status } : undefined),
  });
}

export function usePlansQuery() {
  return useQuery({ queryKey: PLANS_KEY, queryFn: listPlans });
}

export function useTenantEntitlements(id: string | null) {
  return useQuery({
    queryKey: entitlementsKey(id ?? ''),
    queryFn: () => getEntitlements(id as string),
    enabled: !!id,
  });
}

export function useTenantUsage(id: string | null) {
  return useQuery({
    queryKey: usageKey(id ?? ''),
    queryFn: () => getTenantUsage(id as string),
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTenantInput) => createTenant(input),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: TENANTS_KEY });
      toast.success(`Tenant “${t.name}” created`);
    },
    onError: (err) => toast.error(extract(err)),
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTenantInput }) =>
      updateTenant(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANTS_KEY });
      toast.success('Tenant updated');
    },
    onError: (err) => toast.error(extract(err)),
  });
}

export function useChangeTenantStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TenantStatus }) =>
      changeTenantStatus(id, status),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: TENANTS_KEY });
      qc.invalidateQueries({ queryKey: entitlementsKey(t.id) });
      toast.success(`Status changed to ${t.status}`);
    },
    onError: (err) => toast.error(extract(err)),
  });
}

export function useArchiveTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveTenant(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANTS_KEY });
      toast.success('Tenant archived');
    },
    onError: (err) => toast.error(extract(err)),
  });
}

export function useAssignPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, planId }: { id: string; planId: string }) => assignPlan(id, planId),
    onSuccess: (ent) => {
      qc.invalidateQueries({ queryKey: TENANTS_KEY });
      qc.invalidateQueries({ queryKey: entitlementsKey(ent.tenantId) });
      qc.invalidateQueries({ queryKey: usageKey(ent.tenantId) });
      toast.success('Plan changed');
    },
    onError: (err) => toast.error(extract(err)),
  });
}

export function useSetTenantFeatures() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      overrides,
    }: {
      id: string;
      overrides: Partial<Record<TenantFeature, boolean | null>>;
    }) => setTenantFeatures(id, overrides),
    onSuccess: (ent) => {
      qc.invalidateQueries({ queryKey: TENANTS_KEY });
      qc.invalidateQueries({ queryKey: entitlementsKey(ent.tenantId) });
      toast.success('Features updated');
    },
    onError: (err) => toast.error(extract(err)),
  });
}

export function useResetTenantUsage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, metric }: { id: string; metric?: UsageMetric }) =>
      resetTenantUsage(id, metric),
    onSuccess: (summary) => {
      qc.invalidateQueries({ queryKey: usageKey(summary.tenantId) });
      toast.success('Usage reset');
    },
    onError: (err) => toast.error(extract(err)),
  });
}

function extract(err: unknown): string {
  if (typeof err === 'object' && err && 'response' in err) {
    const m = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m) && typeof m[0] === 'string') return m[0];
  }
  return 'Operation failed';
}
