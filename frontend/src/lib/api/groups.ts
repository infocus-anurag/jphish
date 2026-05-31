import apiClient from '@/lib/api-client';

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  groupId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  department: string | null;
  position: string | null;
  addedAt: string;
}

export interface GroupDetail extends GroupSummary {
  members: GroupMember[];
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  members?: Array<Omit<GroupMember, 'groupId' | 'addedAt'>>;
}

export type UpdateGroupInput = {
  name?: string;
  description?: string;
  isActive?: boolean;
};

export async function listGroups(): Promise<{ groups: GroupSummary[]; total: number }> {
  const { data } = await apiClient.get<{ groups: GroupSummary[]; total: number }>('/groups');
  return data;
}

export async function getGroup(id: string): Promise<GroupDetail> {
  const { data } = await apiClient.get<GroupDetail>(`/groups/${id}`);
  return data;
}

export async function createGroup(input: CreateGroupInput): Promise<GroupSummary> {
  const { data } = await apiClient.post<GroupSummary>('/groups', input);
  return data;
}

export async function updateGroup(id: string, input: UpdateGroupInput): Promise<GroupSummary> {
  const { data } = await apiClient.patch<GroupSummary>(`/groups/${id}`, input);
  return data;
}

export async function deleteGroup(id: string): Promise<void> {
  await apiClient.delete(`/groups/${id}`);
}

export async function addGroupMembers(
  id: string,
  members: Array<Omit<GroupMember, 'groupId' | 'addedAt'>>,
): Promise<{ added: number }> {
  const { data } = await apiClient.post<{ added: number }>(`/groups/${id}/members`, { members });
  return data;
}

export async function removeGroupMember(id: string, email: string): Promise<void> {
  await apiClient.delete(`/groups/${id}/members/${encodeURIComponent(email)}`);
}
