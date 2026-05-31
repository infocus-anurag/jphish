import apiClient from '@/lib/api-client';

export interface SmtpProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromEmail: string;
  fromName: string | null;
  isActive: boolean;
  lastTestedAt: string | null;
  testSuccessful: boolean;
  testError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSmtpProfileInput {
  name: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName?: string;
}

export type UpdateSmtpProfileInput = Partial<CreateSmtpProfileInput> & {
  isActive?: boolean;
};

export async function listSmtpProfiles(): Promise<[SmtpProfile[], number]> {
  const { data } = await apiClient.get<[SmtpProfile[], number]>('/smtp-profiles');
  return data;
}

export async function getSmtpProfile(id: string): Promise<SmtpProfile> {
  const { data } = await apiClient.get<SmtpProfile>(`/smtp-profiles/${id}`);
  return data;
}

export async function createSmtpProfile(input: CreateSmtpProfileInput): Promise<SmtpProfile> {
  const { data } = await apiClient.post<SmtpProfile>('/smtp-profiles', input);
  return data;
}

export async function updateSmtpProfile(
  id: string,
  input: UpdateSmtpProfileInput,
): Promise<SmtpProfile> {
  const { data } = await apiClient.patch<SmtpProfile>(`/smtp-profiles/${id}`, input);
  return data;
}

export async function deleteSmtpProfile(id: string): Promise<void> {
  await apiClient.delete(`/smtp-profiles/${id}`);
}

export async function testSmtpProfile(id: string, testEmail: string): Promise<SmtpProfile> {
  const { data } = await apiClient.post<SmtpProfile>(`/smtp-profiles/${id}/test`, { testEmail });
  return data;
}
