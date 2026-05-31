import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';

import { CampaignTrackingEvent } from '../entities/campaign-tracking-event.entity';
import { TrackingEventType } from '../enums/tracking-event-type.enum';
import { Campaign } from '@/modules/campaigns/entities/campaign.entity';
import {
  CampaignRecipient,
  CampaignRecipientStatus,
} from '@/modules/campaigns/entities/campaign-recipient.entity';

@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);

  constructor(
    @InjectRepository(CampaignTrackingEvent)
    private events: Repository<CampaignTrackingEvent>,
    @InjectRepository(CampaignRecipient)
    private recipients: Repository<CampaignRecipient>,
    @InjectRepository(Campaign)
    private campaigns: Repository<Campaign>,
    private config: ConfigService,
  ) {}

  // ─── Public URL helpers ────────────────────────────────────────────────

  publicBaseUrl(): string {
    return this.config.get<string>('PUBLIC_LANDING_URL') || 'http://localhost:3002';
  }

  getTrackingPixelUrl(trackingId: string): string {
    return `${this.publicBaseUrl()}/t/o/${trackingId}`;
  }

  getClickTrackingUrl(trackingId: string, targetUrl: string): string {
    const encoded = Buffer.from(targetUrl).toString('base64url');
    return `${this.publicBaseUrl()}/t/c/${trackingId}?u=${encoded}`;
  }

  getLandingPageUrl(slug: string, trackingId: string): string {
    return `${this.publicBaseUrl()}/p/${slug}/${trackingId}`;
  }

  getReportUrl(trackingId: string): string {
    return `${this.publicBaseUrl()}/t/r/${trackingId}`;
  }

  // ─── Tracking entry points (called by the public phish-server) ─────────

  async trackOpen(trackingId: string, metadata?: Record<string, any>): Promise<void> {
    const recipient = await this.recipients.findOne({ where: { trackingId } });
    if (!recipient) {
      this.logger.warn(`trackOpen: unknown trackingId ${trackingId}`);
      return;
    }
    await this.recordEvent(recipient, TrackingEventType.OPEN, metadata);
    if (!recipient.openedAt) {
      recipient.openedAt = new Date();
      if (
        recipient.status === CampaignRecipientStatus.SENT ||
        recipient.status === CampaignRecipientStatus.PENDING
      ) {
        recipient.status = CampaignRecipientStatus.OPENED;
      }
      await this.recipients.save(recipient);
      await this.campaigns.increment({ id: recipient.campaignId }, 'emailsOpened', 1);
    }
  }

  async trackClick(
    trackingId: string,
    linkUrl: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const recipient = await this.recipients.findOne({ where: { trackingId } });
    if (!recipient) {
      this.logger.warn(`trackClick: unknown trackingId ${trackingId}`);
      return;
    }
    await this.recordEvent(recipient, TrackingEventType.CLICK, { ...metadata, linkUrl });
    if (!recipient.clickedAt) {
      recipient.clickedAt = new Date();
      recipient.status = CampaignRecipientStatus.CLICKED;
      await this.recipients.save(recipient);
      await this.campaigns.increment({ id: recipient.campaignId }, 'emailsClicked', 1);
    }
  }

  async trackLandingView(trackingId: string, metadata?: Record<string, any>): Promise<void> {
    const recipient = await this.recipients.findOne({ where: { trackingId } });
    if (!recipient) return;
    await this.recordEvent(recipient, TrackingEventType.LANDING_VIEW, metadata);
    // Treat a landing view as a click if we haven't seen one yet (the
    // pixel-less recipients who paste the URL directly).
    if (!recipient.clickedAt) {
      recipient.clickedAt = new Date();
      recipient.status = CampaignRecipientStatus.CLICKED;
      await this.recipients.save(recipient);
      await this.campaigns.increment({ id: recipient.campaignId }, 'emailsClicked', 1);
    }
  }

  async trackSubmission(
    trackingId: string,
    formData?: Record<string, any>,
    metadata?: Record<string, any>,
  ): Promise<{ campaignId: string; recipientEmail: string }> {
    const recipient = await this.recipients.findOne({ where: { trackingId } });
    if (!recipient) {
      throw new NotFoundException('Unknown tracking id');
    }
    // SECURITY: this captures whatever the target typed into the phishing
    // form — including passwords — so the security team can demonstrate the
    // risk in the report. Treat campaign_tracking_events.metadata as sensitive
    // (restrict report access, consider encryption at rest / a retention policy).
    const submittedData = formData ?? {};
    const fieldNames = Object.keys(submittedData);
    await this.recordEvent(recipient, TrackingEventType.FORM_SUBMISSION, {
      ...metadata,
      submittedData,
      fieldNames,
      fieldCount: fieldNames.length,
    });
    if (!recipient.submittedAt) {
      recipient.submittedAt = new Date();
      recipient.status = CampaignRecipientStatus.SUBMITTED;
      await this.recipients.save(recipient);
      await this.campaigns.increment({ id: recipient.campaignId }, 'formsSubmitted', 1);
    }
    return { campaignId: recipient.campaignId, recipientEmail: recipient.email };
  }

  async trackReport(trackingId: string, metadata?: Record<string, any>): Promise<void> {
    const recipient = await this.recipients.findOne({ where: { trackingId } });
    if (!recipient) return;
    await this.recordEvent(recipient, TrackingEventType.REPORTED, metadata);
    if (!recipient.reportedAt) {
      recipient.reportedAt = new Date();
      recipient.status = CampaignRecipientStatus.REPORTED;
      await this.recipients.save(recipient);
    }
  }

  // ─── Stats / event reads ───────────────────────────────────────────────

  async getCampaignStats(campaignId: string): Promise<{
    sent: number;
    opened: number;
    clicked: number;
    submitted: number;
    reported: number;
  }> {
    const campaign = await this.campaigns.findOne({ where: { id: campaignId } });
    const reported = await this.events.count({
      where: { campaignId, eventType: TrackingEventType.REPORTED },
    });
    return {
      sent: campaign?.emailsSent ?? 0,
      opened: campaign?.emailsOpened ?? 0,
      clicked: campaign?.emailsClicked ?? 0,
      submitted: campaign?.formsSubmitted ?? 0,
      reported,
    };
  }

  async getCampaignEvents(
    campaignId: string,
    skip = 0,
    take = 50,
  ): Promise<[CampaignTrackingEvent[], number]> {
    return this.events.findAndCount({
      where: { campaignId },
      order: { timestamp: 'DESC' },
      skip,
      take,
    });
  }

  async getRecipientEvents(
    campaignId: string,
    recipientEmail: string,
  ): Promise<CampaignTrackingEvent[]> {
    return this.events.find({
      where: { campaignId, recipientEmail },
      order: { timestamp: 'ASC' },
    });
  }

  private async recordEvent(
    recipient: CampaignRecipient,
    eventType: TrackingEventType,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.events.insert({
        campaignId: recipient.campaignId,
        recipientEmail: recipient.email,
        eventId: uuid(),
        eventType,
        trackingId: recipient.trackingId ?? uuid(),
        metadata: metadata ?? null,
        timestamp: new Date(),
      });
    } catch (err) {
      // Never let tracking failures break the public flow.
      this.logger.error(`Failed to record ${eventType} for ${recipient.email}:`, err);
    }
  }
}
