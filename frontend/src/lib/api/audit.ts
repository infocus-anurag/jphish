import apiClient from '@/lib/api-client';

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export async function listAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
  const { data } = await apiClient.get<AuditLogEntry[]>(`/audit-logs?limit=${limit}`);
  return data;
}
