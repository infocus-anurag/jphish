export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  startDate: Date;
  endDate: Date;
  templateId: string;
  targetGroups: string[];
  statistics: CampaignStatistics;
  createdAt: Date;
  updatedAt: Date;
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

export interface CampaignStatistics {
  totalSent: number;
  opened: number;
  clicked: number;
  reported: number;
}

export interface CreateCampaignRequest {
  name: string;
  description: string;
  templateId: string;
  startDate: Date;
  endDate: Date;
  targetGroups: string[];
}
