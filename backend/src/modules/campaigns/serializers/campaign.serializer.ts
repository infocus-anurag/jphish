import { Campaign } from '../entities/campaign.entity';
import { CampaignStatus } from '../enums/campaign-status.enum';

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
  statistics: {
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
  };
  createdAt: string;
  updatedAt: string;
}

export function toCampaignView(
  campaign: Campaign,
  ownerName?: string,
  emailsReported = 0,
): CampaignView {
  const emailsSent = campaign.emailsSent || 0;

  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    templateId: campaign.templateId,
    smtpProfileId: campaign.smtpProfileId,
    landingPageId: campaign.landingPageId,
    groupId: campaign.groupId,
    ownerId: campaign.ownerId,
    ownerName: ownerName || 'Unknown',
    approvedBy: campaign.approvedBy,
    startDate: campaign.startDate.toISOString(),
    endDate: campaign.endDate?.toISOString() ?? null,
    isAdaptive: campaign.isAdaptive,
    launchedAt: campaign.launchedAt?.toISOString() ?? null,
    completedAt: campaign.completedAt?.toISOString() ?? null,
    statistics: {
      totalRecipients: campaign.totalRecipients,
      emailsSent,
      emailsOpened: campaign.emailsOpened || 0,
      emailsClicked: campaign.emailsClicked || 0,
      formsSubmitted: campaign.formsSubmitted || 0,
      emailsReported,
      bouncedEmails: campaign.bouncedEmails || 0,
      openRate: emailsSent > 0 ? (campaign.emailsOpened / emailsSent) * 100 : 0,
      clickRate: emailsSent > 0 ? (campaign.emailsClicked / emailsSent) * 100 : 0,
      submissionRate: emailsSent > 0 ? (campaign.formsSubmitted / emailsSent) * 100 : 0,
      reportRate: emailsSent > 0 ? (emailsReported / emailsSent) * 100 : 0,
    },
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}
