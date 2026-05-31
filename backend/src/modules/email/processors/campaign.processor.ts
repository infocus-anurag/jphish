import { Injectable, Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EmailService } from '../services/email.service';
import { EmailTemplateService } from '../services/email-template.service';
import { EmailTrackingService } from '../services/email-tracking.service';

import { SmtpProfile } from '../entities/smtp-profile.entity';
import { EmailTemplate } from '../entities/email-template.entity';
import { Campaign } from '@/modules/campaigns/entities/campaign.entity';
import { CampaignStatus } from '@/modules/campaigns/enums/campaign-status.enum';
import {
  CampaignRecipient,
  CampaignRecipientStatus,
} from '@/modules/campaigns/entities/campaign-recipient.entity';

/** How many phishing emails the worker sends in parallel. Paired with the
 *  pooled SMTP transporter in EmailService so a bulk (100s) campaign drains
 *  quickly instead of one-email-at-a-time. Override via MAIL_SEND_CONCURRENCY
 *  (a real env/Docker var — this is read at module load, before .env parsing).
 *  Keep it at or below the SMTP pool's maxConnections. */
const SEND_CONCURRENCY = parseInt(process.env.MAIL_SEND_CONCURRENCY ?? '', 10) || 5;

interface CampaignEmailJobData {
  campaignId: string;
  recipientEmail: string;
  recipientName?: string;
  templateId: string;
  smtpProfileId: string;
  templateVariables: Record<string, string>;
  trackingId: string;
  /** Slug of the landing page to send the target to. Optional. */
  landingPageSlug?: string | null;
}

@Processor('campaigns')
@Injectable()
export class CampaignProcessor {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(
    private emailService: EmailService,
    private templateService: EmailTemplateService,
    private trackingService: EmailTrackingService,
    @InjectRepository(EmailTemplate) private templates: Repository<EmailTemplate>,
    @InjectRepository(SmtpProfile) private smtpProfiles: Repository<SmtpProfile>,
    @InjectRepository(Campaign) private campaigns: Repository<Campaign>,
    @InjectRepository(CampaignRecipient) private recipients: Repository<CampaignRecipient>,
  ) {}

  @Process({ name: 'SEND_CAMPAIGN_EMAIL', concurrency: SEND_CONCURRENCY })
  async handleSendCampaignEmail(job: Job<CampaignEmailJobData>) {
    const {
      campaignId,
      recipientEmail,
      templateId,
      smtpProfileId,
      templateVariables,
      trackingId,
      landingPageSlug,
    } = job.data;

    this.logger.debug(`Sending phish email to ${recipientEmail} (campaign ${campaignId})`);

    // Honor per-campaign pause: a job already queued when the campaign is
    // paused/stopped must not send. resume() re-enqueues PENDING recipients.
    const campaign = await this.campaigns.findOne({ where: { id: campaignId } });
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);
    if (campaign.status !== CampaignStatus.RUNNING) {
      this.logger.debug(
        `Skipping ${recipientEmail}: campaign ${campaignId} is ${campaign.status}`,
      );
      return { skipped: true, reason: `campaign ${campaign.status}` };
    }

    // Idempotency: never re-send to a recipient that was already processed
    // (guards against resume re-enqueuing a recipient with an in-flight job).
    const recipient = await this.recipients.findOne({
      where: { campaignId, email: recipientEmail },
    });
    if (recipient && recipient.status !== CampaignRecipientStatus.PENDING) {
      this.logger.debug(
        `Skipping ${recipientEmail}: recipient already ${recipient.status}`,
      );
      return { skipped: true, reason: `recipient ${recipient.status}` };
    }

    const template = await this.templates.findOne({ where: { id: templateId } });
    if (!template) throw new Error(`Template ${templateId} not found`);

    const smtpProfile = await this.smtpProfiles.findOne({ where: { id: smtpProfileId } });
    if (!smtpProfile) throw new Error(`SMTP profile ${smtpProfileId} not found`);

    const rendered = this.templateService.renderTemplate(template, templateVariables);

    const pixelUrl = this.trackingService.getTrackingPixelUrl(trackingId);
    const reportUrl = this.trackingService.getReportUrl(trackingId);
    const landingUrl = landingPageSlug
      ? this.trackingService.getLandingPageUrl(landingPageSlug, trackingId)
      : null;

    // Rewrite every <a href="..."> in the template so any click is funneled
    // through the click-tracker which then redirects to the campaign's
    // landing page (or back to the original URL when no landing page is
    // configured).
    let html = rendered.html;
    html = html.replace(/href=["']([^"']+)["']/gi, (_match, originalUrl) => {
      const target = landingUrl ?? originalUrl;
      const tracked = this.trackingService.getClickTrackingUrl(trackingId, target);
      return `href="${tracked}"`;
    });

    // Append the open-tracking pixel.
    html += `\n<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none" />`;

    try {
      const result = await this.emailService.sendEmail(
        recipientEmail,
        rendered.subject,
        html,
        rendered.text,
        smtpProfile,
        {
          'X-Campaign-ID': campaignId,
          'X-Tracking-ID': trackingId,
          // RFC 8058 one-click report. Mailbox clients that honour this
          // (Gmail, Outlook) will POST when the user hits "Report".
          'List-Unsubscribe': `<${reportUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      );

      await this.recipients.update(
        { campaignId, email: recipientEmail },
        { status: CampaignRecipientStatus.SENT, sentAt: new Date() },
      );
      await this.campaigns.increment({ id: campaignId }, 'emailsSent', 1);

      this.logger.debug(`Email sent to ${recipientEmail} messageId=${result.messageId}`);
      job.progress(100);
      return { success: true, messageId: result.messageId, previewUrl: result.previewUrl };
    } catch (error) {
      this.logger.error(`Failed to send email to ${recipientEmail}:`, error);

      // On final failure, mark the recipient as bounced so stats still add up.
      if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
        await this.recipients.update(
          { campaignId, email: recipientEmail },
          { status: CampaignRecipientStatus.BOUNCED },
        );
        await this.campaigns.increment({ id: campaignId }, 'bouncedEmails', 1);
      }
      throw error;
    }
  }
}
