import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';

import { Campaign } from '../entities/campaign.entity';
import {
  CampaignRecipient,
  CampaignRecipientStatus,
} from '../entities/campaign-recipient.entity';
import { CampaignStatus } from '../enums/campaign-status.enum';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  AddRecipientsDto,
} from '../dto/create-campaign.dto';
import { User } from '@/modules/auth/entities/user.entity';
import { AuditService, AuditContext } from '@/modules/auth/services/audit.service';
import { CampaignView, toCampaignView } from '../serializers/campaign.serializer';
import { GroupMember } from '@/modules/groups/entities/group-member.entity';
import { LandingPage } from '@/modules/landing/entities/landing-page.entity';
import { EmailTemplate } from '@/modules/email/entities/email-template.entity';
import { SmtpProfile } from '@/modules/email/entities/smtp-profile.entity';
import { CampaignTrackingEvent } from '@/modules/email/entities/campaign-tracking-event.entity';
import { TrackingEventType } from '@/modules/email/enums/tracking-event-type.enum';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign) private campaigns: Repository<Campaign>,
    @InjectRepository(CampaignRecipient) private recipients: Repository<CampaignRecipient>,
    @InjectRepository(GroupMember) private groupMembers: Repository<GroupMember>,
    @InjectRepository(LandingPage) private landingPages: Repository<LandingPage>,
    @InjectRepository(EmailTemplate) private templates: Repository<EmailTemplate>,
    @InjectRepository(SmtpProfile) private smtpProfiles: Repository<SmtpProfile>,
    @InjectRepository(CampaignTrackingEvent) private events: Repository<CampaignTrackingEvent>,
    @InjectQueue('campaigns') private readonly queue: Queue,
    private audit: AuditService,
  ) {}

  // ─── Create ────────────────────────────────────────────────────────────

  async create(dto: CreateCampaignDto, creator: User, ctx: AuditContext): Promise<CampaignView> {
    if (await this.campaigns.findOne({ where: { name: dto.name } })) {
      throw new ConflictException('A campaign with this name already exists');
    }

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (endDate && endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Validate FK targets so we fail before saving.
    if (!(await this.templates.findOne({ where: { id: dto.templateId } }))) {
      throw new BadRequestException('Email template not found');
    }
    if (dto.smtpProfileId && !(await this.smtpProfiles.findOne({ where: { id: dto.smtpProfileId } }))) {
      throw new BadRequestException('SMTP profile not found');
    }
    if (dto.landingPageId && !(await this.landingPages.findOne({ where: { id: dto.landingPageId } }))) {
      throw new BadRequestException('Landing page not found');
    }

    // Resolve recipients: groupId expands into emails; explicit recipients are merged.
    const emailsFromGroup: { email: string; firstName?: string | null; lastName?: string | null; department?: string | null }[] = dto.groupId
      ? (await this.groupMembers.find({ where: { groupId: dto.groupId } })).map((m) => ({
          email: m.email,
          firstName: m.firstName,
          lastName: m.lastName,
          department: m.department,
        }))
      : [];
    const adHoc = (dto.recipients ?? []).map((email) => ({ email }));

    const merged = new Map<string, { email: string; firstName?: string | null; lastName?: string | null; department?: string | null }>();
    for (const r of [...emailsFromGroup, ...adHoc]) {
      merged.set(r.email.toLowerCase(), r);
    }
    const recipientList = Array.from(merged.values());
    if (recipientList.length === 0) {
      throw new BadRequestException(
        'Campaign must target at least one recipient (via groupId or recipients[])',
      );
    }

    const campaign = this.campaigns.create({
      name: dto.name,
      description: dto.description ?? null,
      templateId: dto.templateId,
      smtpProfileId: dto.smtpProfileId ?? null,
      landingPageId: dto.landingPageId ?? null,
      groupId: dto.groupId ?? null,
      ownerId: creator.id,
      startDate,
      endDate,
      isAdaptive: dto.isAdaptive ?? false,
      status: CampaignStatus.DRAFT,
      totalRecipients: recipientList.length,
    });

    const saved = await this.campaigns.save(campaign);

    await this.recipients.save(
      recipientList.map((r) =>
        this.recipients.create({
          campaignId: saved.id,
          email: r.email,
          firstName: r.firstName ?? null,
          lastName: r.lastName ?? null,
          department: r.department ?? null,
          groupId: dto.groupId ?? null,
          status: CampaignRecipientStatus.PENDING,
          trackingId: uuid(),
        }),
      ),
    );

    await this.audit.record({
      action: 'campaign.created',
      actorId: creator.id,
      targetId: saved.id,
      ctx,
      metadata: { campaignName: saved.name, recipientCount: recipientList.length },
    });

    return toCampaignView(saved, creator.firstName);
  }

  // ─── Read ──────────────────────────────────────────────────────────────

  async findAll(
    skip = 0,
    take = 50,
    filters?: { status?: CampaignStatus },
  ): Promise<[CampaignView[], number]> {
    const qb = this.campaigns
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.owner', 'owner');
    if (filters?.status) {
      qb.where('campaign.status = :status', { status: filters.status });
    }
    qb.orderBy('campaign.createdAt', 'DESC').skip(skip).take(take);

    const [rows, total] = await qb.getManyAndCount();

    // Fold REPORTED counts in one query rather than n+1.
    const ids = rows.map((c) => c.id);
    const reported = ids.length
      ? await this.events
          .createQueryBuilder('e')
          .select('e.campaignId', 'campaignId')
          .addSelect('COUNT(*)::int', 'cnt')
          .where('e.campaignId IN (:...ids)', { ids })
          .andWhere('e.eventType = :t', { t: TrackingEventType.REPORTED })
          .groupBy('e.campaignId')
          .getRawMany<{ campaignId: string; cnt: number }>()
      : [];
    const byId = new Map(reported.map((r) => [r.campaignId, Number(r.cnt)]));

    return [rows.map((c) => toCampaignView(c, c.owner?.firstName, byId.get(c.id) ?? 0)), total];
  }

  async findById(id: string): Promise<CampaignView> {
    const campaign = await this.campaigns.findOne({ where: { id }, relations: ['owner'] });
    if (!campaign) throw new NotFoundException('Campaign not found');
    const reported = await this.events.count({
      where: { campaignId: id, eventType: TrackingEventType.REPORTED },
    });
    return toCampaignView(campaign, campaign.owner?.firstName, reported);
  }

  // ─── Update / delete ───────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateCampaignDto,
    user: User,
    ctx: AuditContext,
  ): Promise<CampaignView> {
    const campaign = await this.campaigns.findOne({ where: { id }, relations: ['owner'] });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Only draft campaigns can be updated');
    }
    if (campaign.ownerId !== user.id) {
      throw new ForbiddenException('You can only update your own campaigns');
    }
    if (dto.startDate || dto.endDate) {
      const startDate = dto.startDate ? new Date(dto.startDate) : campaign.startDate;
      const endDate = dto.endDate ? new Date(dto.endDate) : campaign.endDate;
      if (endDate && endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }
    if (dto.name && dto.name !== campaign.name) {
      if (await this.campaigns.findOne({ where: { name: dto.name } })) {
        throw new ConflictException('Name already in use');
      }
    }

    Object.assign(campaign, {
      name: dto.name ?? campaign.name,
      description: dto.description ?? campaign.description,
      templateId: dto.templateId ?? campaign.templateId,
      smtpProfileId: dto.smtpProfileId ?? campaign.smtpProfileId,
      landingPageId: dto.landingPageId ?? campaign.landingPageId,
      groupId: dto.groupId ?? campaign.groupId,
      startDate: dto.startDate ? new Date(dto.startDate) : campaign.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : campaign.endDate,
      isAdaptive: dto.isAdaptive ?? campaign.isAdaptive,
    });

    const saved = await this.campaigns.save(campaign);
    await this.audit.record({
      action: 'campaign.updated',
      actorId: user.id,
      targetId: id,
      ctx,
      metadata: { changes: dto },
    });
    return toCampaignView(saved, campaign.owner?.firstName);
  }

  async delete(id: string, user: User, ctx: AuditContext): Promise<void> {
    const campaign = await this.campaigns.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Only draft campaigns can be deleted');
    }
    if (campaign.ownerId !== user.id) {
      throw new ForbiddenException('You can only delete your own campaigns');
    }
    await this.campaigns.remove(campaign);
    await this.audit.record({
      action: 'campaign.deleted',
      actorId: user.id,
      targetId: id,
      ctx,
      metadata: { campaignName: campaign.name },
    });
  }

  // ─── Launch / pause / resume ───────────────────────────────────────────

  async launch(id: string, user: User, ctx: AuditContext): Promise<CampaignView> {
    const campaign = await this.campaigns.findOne({ where: { id }, relations: ['owner'] });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Only draft campaigns can be launched');
    }
    if (!campaign.smtpProfileId) {
      throw new BadRequestException('Campaign must have an SMTP profile before launch');
    }

    const template = await this.templates.findOne({ where: { id: campaign.templateId } });
    if (!template) throw new BadRequestException('Email template no longer exists');

    const landing = campaign.landingPageId
      ? await this.landingPages.findOne({ where: { id: campaign.landingPageId } })
      : null;

    const recipients = await this.recipients.find({ where: { campaignId: id } });
    if (recipients.length === 0) {
      throw new BadRequestException('Cannot launch a campaign with zero recipients');
    }

    // Persist RUNNING *before* enqueueing. The CampaignProcessor skips any job
    // whose campaign is not yet RUNNING, and the Bull worker can pick up the
    // first job while this method is still mid-loop adding the rest. If we
    // enqueued first, every job that the worker grabs before this save commits
    // would be silently skipped ("campaign draft") — which is why campaigns
    // with >1 recipient appeared to send nothing while single-recipient ones
    // (where the save usually wins the race) worked. resume() already follows
    // this save-then-enqueue order.
    campaign.status = CampaignStatus.RUNNING;
    campaign.launchedAt = new Date();
    const saved = await this.campaigns.save(campaign);

    await this.enqueueSendJobs(campaign, recipients, landing?.slug ?? null);

    await this.audit.record({
      action: 'campaign.launched',
      actorId: user.id,
      targetId: id,
      ctx,
      metadata: { campaignName: campaign.name, jobs: recipients.length },
    });

    return toCampaignView(saved, campaign.owner?.firstName);
  }

  async pause(id: string, user: User, ctx: AuditContext): Promise<CampaignView> {
    const campaign = await this.campaigns.findOne({ where: { id }, relations: ['owner'] });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== CampaignStatus.RUNNING) {
      throw new BadRequestException('Only running campaigns can be paused');
    }
    // Per-campaign pause: flip status only. The shared queue is NOT paused —
    // doing so would halt every other campaign too. The processor refuses to
    // send for any campaign whose status is not RUNNING.
    campaign.status = CampaignStatus.PAUSED;
    const saved = await this.campaigns.save(campaign);
    await this.audit.record({ action: 'campaign.paused', actorId: user.id, targetId: id, ctx });
    return toCampaignView(saved, campaign.owner?.firstName);
  }

  async resume(id: string, user: User, ctx: AuditContext): Promise<CampaignView> {
    const campaign = await this.campaigns.findOne({ where: { id }, relations: ['owner'] });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Only paused campaigns can be resumed');
    }
    campaign.status = CampaignStatus.RUNNING;
    const saved = await this.campaigns.save(campaign);

    // Re-enqueue sends for recipients that were never delivered while paused.
    const pending = await this.recipients.find({
      where: { campaignId: id, status: CampaignRecipientStatus.PENDING },
    });
    if (pending.length) {
      const landing = campaign.landingPageId
        ? await this.landingPages.findOne({ where: { id: campaign.landingPageId } })
        : null;
      await this.enqueueSendJobs(campaign, pending, landing?.slug ?? null);
    }

    await this.audit.record({ action: 'campaign.resumed', actorId: user.id, targetId: id, ctx });
    return toCampaignView(saved, campaign.owner?.firstName);
  }

  /** Enqueue one SEND_CAMPAIGN_EMAIL job per recipient. Shared by launch + resume. */
  private async enqueueSendJobs(
    campaign: Campaign,
    recipients: CampaignRecipient[],
    landingPageSlug: string | null,
  ): Promise<void> {
    for (const recipient of recipients) {
      if (!recipient.trackingId) {
        recipient.trackingId = uuid();
        await this.recipients.save(recipient);
      }

      await this.queue.add(
        'SEND_CAMPAIGN_EMAIL',
        {
          campaignId: campaign.id,
          recipientEmail: recipient.email,
          recipientName:
            [recipient.firstName, recipient.lastName].filter(Boolean).join(' ') || undefined,
          templateId: campaign.templateId,
          smtpProfileId: campaign.smtpProfileId,
          trackingId: recipient.trackingId,
          landingPageSlug,
          templateVariables: {
            firstName: recipient.firstName ?? '',
            lastName: recipient.lastName ?? '',
            email: recipient.email,
            department: recipient.department ?? '',
          },
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      );
    }
  }

  // ─── Recipient mgmt ────────────────────────────────────────────────────

  async addRecipients(
    id: string,
    dto: AddRecipientsDto,
    user: User,
    ctx: AuditContext,
  ): Promise<void> {
    const campaign = await this.campaigns.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Can only add recipients to draft campaigns');
    }
    if (campaign.ownerId !== user.id) {
      throw new ForbiddenException('You can only modify your own campaigns');
    }

    const existing = (await this.recipients.find({ where: { campaignId: id }, select: ['email'] })).map(
      (r) => r.email.toLowerCase(),
    );
    const fresh = dto.recipients.filter((e) => !existing.includes(e.toLowerCase()));
    if (fresh.length === 0) {
      throw new BadRequestException('All recipients already exist in this campaign');
    }

    await this.recipients.save(
      fresh.map((email) =>
        this.recipients.create({
          campaignId: id,
          email,
          groupId: dto.groupId ?? null,
          status: CampaignRecipientStatus.PENDING,
          trackingId: uuid(),
        }),
      ),
    );
    campaign.totalRecipients += fresh.length;
    await this.campaigns.save(campaign);

    await this.audit.record({
      action: 'campaign.recipients_added',
      actorId: user.id,
      targetId: id,
      ctx,
      metadata: { recipientCount: fresh.length },
    });
  }

  async getRecipients(
    campaignId: string,
    skip = 0,
    take = 50,
  ): Promise<[CampaignRecipient[], number]> {
    return this.recipients.findAndCount({
      where: { campaignId },
      skip,
      take,
      order: { addedAt: 'DESC' },
    });
  }
}
