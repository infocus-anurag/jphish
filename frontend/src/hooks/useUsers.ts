import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createUser,
  deleteUser,
  listUsers,
  setUserRole,
  updateUser,
} from '@/lib/auth-api';
import type {
  AuthUser,
  CreateUserRequest,
  UpdateUserRequest,
  UserRole,
} from '@/types/auth.types';

const KEY = ['users'] as const;

export function useUsersQuery() {
  return useQuery({ queryKey: KEY, queryFn: listUsers });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUserRequest) => createUser(body),
    onSuccess: ({ user, tempPassword }) => {
      qc.invalidateQueries({ queryKey: KEY });
      if (tempPassword) {
        toast.success(`Created ${user.email}. Temp password: ${tempPassword}`, {
          duration: 12_000,
        });
      } else {
        toast.success(`Created ${user.email}`);
      }
    },
    onError: (err) => toast.error(extract(err)),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateUserRequest }) =>
      updateUser(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<AuthUser[]>(KEY);
      if (prev) {
        qc.setQueryData<AuthUser[]>(
          KEY,
          prev.map((u) => (u.id === id ? { ...u, ...body } : u)),
        );
      }
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
      toast.error(extract(err));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      setUserRole(id, role),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(`${user.email} is now ${user.role}`);
    },
    onError: (err) => toast.error(extract(err)),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('User deleted');
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
