import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from '@/modules/campaigns/entities/campaign.entity';
import { CampaignRecipient } from '@/modules/campaigns/entities/campaign-recipient.entity';
import { CampaignTrackingEvent } from '@/modules/email/entities/campaign-tracking-event.entity';
import { TrackingEventType } from '@/modules/email/enums/tracking-event-type.enum';
import { CampaignStatus } from '@/modules/campaigns/enums/campaign-status.enum';

export interface DashboardSummary {
  campaigns: { total: number; running: number; draft: number; completed: number };
  emails: { sent: number; opened: number; clicked: number; submitted: number; reported: number };
  rates: { openRate: number; clickRate: number; submitRate: number; reportRate: number };
}

export interface CampaignReport {
  campaign: {
    id: string;
    name: string;
    status: CampaignStatus;
    startDate: Date;
    endDate: Date | null;
    launchedAt: Date | null;
  };
  totals: {
    recipients: number;
    sent: number;
    opened: number;
    clicked: number;
    submitted: number;
    reported: number;
  };
  rates: { openRate: number; clickRate: number; submitRate: number; reportRate: number };
  timeline: Array<{ ts: Date; type: TrackingEventType; email: string }>;
  // Credentials/data captured from the phishing landing-page form. Sensitive.
  submissions: Array<{
    ts: Date;
    email: string;
    ip: string | null;
    data: Record<string, unknown>;
  }>;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Campaign) private campaigns: Repository<Campaign>,
    @InjectRepository(CampaignRecipient) private recipients: Repository<CampaignRecipient>,
    @InjectRepository(CampaignTrackingEvent) private events: Repository<CampaignTrackingEvent>,
  ) {}

  async dashboard(): Promise<DashboardSummary> {
    const [total, running, draft, completed] = await Promise.all([
      this.campaigns.count(),
      this.campaigns.count({ where: { status: CampaignStatus.RUNNING } }),
      this.campaigns.count({ where: { status: CampaignStatus.DRAFT } }),
      this.campaigns.count({ where: { status: CampaignStatus.COMPLETED } }),
    ]);

    const aggregates = await this.campaigns
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.emailsSent), 0)', 'sent')
      .addSelect('COALESCE(SUM(c.emailsOpened), 0)', 'opened')
      .addSelect('COALESCE(SUM(c.emailsClicked), 0)', 'clicked')
      .addSelect('COALESCE(SUM(c.formsSubmitted), 0)', 'submitted')
      .getRawOne<{ sent: string; opened: string; clicked: string; submitted: string }>();

    const reported = await this.events.count({
      where: { eventType: TrackingEventType.REPORTED },
    });

    const sent = Number(aggregates?.sent ?? 0);
    const opened = Number(aggregates?.opened ?? 0);
    const clicked = Number(aggregates?.clicked ?? 0);
    const submitted = Number(aggregates?.submitted ?? 0);

    return {
      campaigns: { total, running, draft, completed },
      emails: { sent, opened, clicked, submitted, reported },
      rates: {
        openRate: pct(opened, sent),
        clickRate: pct(clicked, sent),
        submitRate: pct(submitted, sent),
        reportRate: pct(reported, sent),
      },
    };
  }

  async campaignReport(id: string): Promise<CampaignReport> {
    const campaign = await this.campaigns.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const recipients = await this.recipients.count({ where: { campaignId: id } });
    const reported = await this.events.count({
      where: { campaignId: id, eventType: TrackingEventType.REPORTED },
    });

    const events = await this.events.find({
      where: { campaignId: id },
      order: { timestamp: 'DESC' },
      take: 200,
    });

    const submissionEvents = await this.events.find({
      where: { campaignId: id, eventType: TrackingEventType.FORM_SUBMISSION },
      order: { timestamp: 'DESC' },
      take: 200,
    });

    const sent = campaign.emailsSent;

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        launchedAt: campaign.launchedAt,
      },
      totals: {
        recipients,
        sent,
        opened: campaign.emailsOpened,
        clicked: campaign.emailsClicked,
        submitted: campaign.formsSubmitted,
        reported,
      },
      rates: {
        openRate: pct(campaign.emailsOpened, sent),
        clickRate: pct(campaign.emailsClicked, sent),
        submitRate: pct(campaign.formsSubmitted, sent),
        reportRate: pct(reported, sent),
      },
      timeline: events.map((e) => ({
        ts: e.timestamp,
        type: e.eventType,
        email: e.recipientEmail,
      })),
      submissions: submissionEvents.map((e) => ({
        ts: e.timestamp,
        email: e.recipientEmail,
        ip: (e.metadata?.ip as string) ?? null,
        data: (e.metadata?.submittedData as Record<string, unknown>) ?? {},
      })),
    };
  }
}

function pct(num: number, den: number): number {
  if (!den) return 0;
  return Math.round((num / den) * 1000) / 10;
}
