import apiClient from '@/lib/api-client';

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'completed'
  | 'archived';

export interface CampaignStatistics {
  totalRecipients: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  formsSubmitted: number;
  emailsReported: number;
  bouncedEmails: number;
  openRate: number;
  clickRate: number;
  submissionRate: number;
  reportRate: number;
}

export interface CampaignView {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  templateId: string;
  smtpProfileId: string | null;
  landingPageId: string | null;
  groupId: string | null;
  ownerId: string;
  ownerName: string;
  approvedBy: string | null;
  startDate: string;
  endDate: string | null;
  isAdaptive: boolean;
  launchedAt: string | null;
  completedAt: string | null;
  statistics: CampaignStatistics;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  templateId: string;
  smtpProfileId?: string;
  landingPageId?: string;
  groupId?: string;
  recipients?: string[];
  startDate: string;
  endDate?: string;
  isAdaptive?: boolean;
}

export type UpdateCampaignInput = Partial<Omit<CreateCampaignInput, 'recipients'>>;

export async function listCampaigns(filter?: {
  status?: CampaignStatus;
  skip?: number;
  take?: number;
}): Promise<{ campaigns: CampaignView[]; total: number }> {
  const params = new URLSearchParams();
  if (filter?.status) params.set('status', filter.status);
  if (filter?.skip != null) params.set('skip', String(filter.skip));
  if (filter?.take != null) params.set('take', String(filter.take));
  const qs = params.toString();
  const { data } = await apiClient.get<{ campaigns: CampaignView[]; total: number }>(
    qs ? `/campaigns?${qs}` : '/campaigns',
  );
  return data;
}

export async function getCampaign(id: string): Promise<CampaignView> {
  const { data } = await apiClient.get<{ campaign: CampaignView }>(`/campaigns/${id}`);
  return data.campaign;
}

export async function createCampaign(input: CreateCampaignInput): Promise<CampaignView> {
  const { data } = await apiClient.post<{ campaign: CampaignView }>('/campaigns', input);
  return data.campaign;
}

export async function updateCampaign(
  id: string,
  input: UpdateCampaignInput,
): Promise<CampaignView> {
  const { data } = await apiClient.patch<{ campaign: CampaignView }>(`/campaigns/${id}`, input);
  return data.campaign;
}

export async function deleteCampaign(id: string): Promise<void> {
  await apiClient.delete(`/campaigns/${id}`);
}

export async function launchCampaign(id: string): Promise<CampaignView> {
  const { data } = await apiClient.patch<{ campaign: CampaignView }>(`/campaigns/${id}/launch`);
  return data.campaign;
}

export async function pauseCampaign(id: string): Promise<CampaignView> {
  const { data } = await apiClient.patch<{ campaign: CampaignView }>(`/campaigns/${id}/pause`);
  return data.campaign;
}

export async function resumeCampaign(id: string): Promise<CampaignView> {
  const { data } = await apiClient.patch<{ campaign: CampaignView }>(`/campaigns/${id}/resume`);
  return data.campaign;
}

export async function getCampaignRecipients(
  id: string,
): Promise<{ recipients: any[]; total: number }> {
  const { data } = await apiClient.get<{ recipients: any[]; total: number }>(
    `/campaigns/${id}/recipients`,
  );
  return data;
}
