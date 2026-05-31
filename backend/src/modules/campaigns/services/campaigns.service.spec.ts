import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { CampaignsService } from './campaigns.service';
import { Campaign } from '../entities/campaign.entity';
import { CampaignRecipient } from '../entities/campaign-recipient.entity';
import { User } from '@/modules/auth/entities/user.entity';
import { AuditService } from '@/modules/auth/services/audit.service';
import { CampaignStatus } from '../enums/campaign-status.enum';
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@/modules/auth/enums/user-role.enum';
import { GroupMember } from '@/modules/groups/entities/group-member.entity';
import { LandingPage } from '@/modules/landing/entities/landing-page.entity';
import { EmailTemplate } from '@/modules/email/entities/email-template.entity';
import { SmtpProfile } from '@/modules/email/entities/smtp-profile.entity';
import { CampaignTrackingEvent } from '@/modules/email/entities/campaign-tracking-event.entity';

describe('CampaignsService', () => {
  let service: CampaignsService;
  let campaignsRepo: any;
  let recipientsRepo: any;
  let templatesRepo: any;
  let smtpProfilesRepo: any;
  let landingPagesRepo: any;
  let groupMembersRepo: any;
  let eventsRepo: any;
  let auditService: any;
  let queue: any;

  const mockUser: User = {
    id: '1',
    email: 'user@test.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.ADMIN,
    passwordHash: '',
    isActive: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const mockRepo = () => ({
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => v),
      remove: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      increment: jest.fn(),
      createQueryBuilder: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: getRepositoryToken(Campaign), useValue: mockRepo() },
        { provide: getRepositoryToken(CampaignRecipient), useValue: mockRepo() },
        { provide: getRepositoryToken(GroupMember), useValue: mockRepo() },
        { provide: getRepositoryToken(LandingPage), useValue: mockRepo() },
        { provide: getRepositoryToken(EmailTemplate), useValue: mockRepo() },
        { provide: getRepositoryToken(SmtpProfile), useValue: mockRepo() },
        { provide: getRepositoryToken(CampaignTrackingEvent), useValue: mockRepo() },
        {
          provide: getQueueToken('campaigns'),
          useValue: { add: jest.fn(), pause: jest.fn(), resume: jest.fn() },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
    campaignsRepo = module.get(getRepositoryToken(Campaign));
    recipientsRepo = module.get(getRepositoryToken(CampaignRecipient));
    templatesRepo = module.get(getRepositoryToken(EmailTemplate));
    smtpProfilesRepo = module.get(getRepositoryToken(SmtpProfile));
    landingPagesRepo = module.get(getRepositoryToken(LandingPage));
    groupMembersRepo = module.get(getRepositoryToken(GroupMember));
    eventsRepo = module.get(getRepositoryToken(CampaignTrackingEvent));
    auditService = module.get(AuditService);
    queue = module.get(getQueueToken('campaigns'));
  });

  describe('create', () => {
    it('creates a campaign with explicit recipients', async () => {
      const dto = {
        name: 'Test Campaign',
        description: 'Test',
        templateId: 'template-1',
        recipients: ['user1@test.com', 'user2@test.com'],
        startDate: new Date().toISOString(),
        endDate: undefined,
        isAdaptive: false,
      };
      campaignsRepo.findOne.mockResolvedValue(null);
      templatesRepo.findOne.mockResolvedValue({ id: 'template-1' });
      campaignsRepo.save.mockImplementation(async (v: any) => ({
        id: 'cmp-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...v,
      }));

      const result = await service.create(dto as any, mockUser, { ip: '127.0.0.1' });

      expect(result.name).toBe(dto.name);
      expect(result.status).toBe(CampaignStatus.DRAFT);
      expect(recipientsRepo.save).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'campaign.created', actorId: mockUser.id }),
      );
    });

    it('rejects duplicate campaign names', async () => {
      const dto = {
        name: 'Duplicate',
        templateId: 'template-1',
        recipients: ['user@test.com'],
        startDate: new Date().toISOString(),
      };
      campaignsRepo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(service.create(dto as any, mockUser, { ip: '127.0.0.1' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects invalid date ranges', async () => {
      const future = new Date(); future.setDate(future.getDate() + 1);
      const dto = {
        name: 'Test',
        templateId: 'template-1',
        recipients: ['user@test.com'],
        startDate: future.toISOString(),
        endDate: new Date().toISOString(),
      };
      campaignsRepo.findOne.mockResolvedValue(null);
      templatesRepo.findOne.mockResolvedValue({ id: 'template-1' });
      await expect(service.create(dto as any, mockUser, { ip: '127.0.0.1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects when neither groupId nor recipients are supplied', async () => {
      const dto = {
        name: 'Test',
        templateId: 'template-1',
        startDate: new Date().toISOString(),
      };
      campaignsRepo.findOne.mockResolvedValue(null);
      templatesRepo.findOne.mockResolvedValue({ id: 'template-1' });
      await expect(service.create(dto as any, mockUser, { ip: '127.0.0.1' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findById', () => {
    it('returns the campaign with stats', async () => {
      campaignsRepo.findOne.mockResolvedValue({
        id: 'cmp-1', name: 'Test', status: CampaignStatus.DRAFT,
        owner: mockUser, startDate: new Date(), endDate: null, isAdaptive: false,
        emailsSent: 0, emailsOpened: 0, emailsClicked: 0, formsSubmitted: 0, bouncedEmails: 0,
        createdAt: new Date(), updatedAt: new Date(), totalRecipients: 0,
      });
      eventsRepo.count.mockResolvedValue(0);
      const result = await service.findById('cmp-1');
      expect(result.id).toBe('cmp-1');
    });

    it('throws when campaign missing', async () => {
      campaignsRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('launch', () => {
    it('rejects launching campaigns without an SMTP profile', async () => {
      campaignsRepo.findOne.mockResolvedValue({
        id: 'cmp-1', status: CampaignStatus.DRAFT, owner: mockUser, ownerId: mockUser.id,
        smtpProfileId: null, templateId: 'template-1',
      });
      await expect(service.launch('cmp-1', mockUser, { ip: '127.0.0.1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects launching a non-draft campaign', async () => {
      campaignsRepo.findOne.mockResolvedValue({
        id: 'cmp-1', status: CampaignStatus.RUNNING, owner: mockUser,
      });
      await expect(service.launch('cmp-1', mockUser, { ip: '127.0.0.1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('enqueues one job per recipient', async () => {
      campaignsRepo.findOne.mockResolvedValue({
        id: 'cmp-1', name: 'Test', status: CampaignStatus.DRAFT,
        owner: mockUser, ownerId: mockUser.id,
        smtpProfileId: 'smtp-1', templateId: 'template-1', landingPageId: null,
        startDate: new Date(), endDate: null, isAdaptive: false,
        emailsSent: 0, emailsOpened: 0, emailsClicked: 0, formsSubmitted: 0, bouncedEmails: 0,
        createdAt: new Date(), updatedAt: new Date(), totalRecipients: 2,
      });
      templatesRepo.findOne.mockResolvedValue({ id: 'template-1' });
      landingPagesRepo.findOne.mockResolvedValue(null);
      recipientsRepo.find.mockResolvedValue([
        { campaignId: 'cmp-1', email: 'a@test.com', trackingId: 't1' },
        { campaignId: 'cmp-1', email: 'b@test.com', trackingId: 't2' },
      ]);
      campaignsRepo.save.mockImplementation(async (v: any) => v);

      const result = await service.launch('cmp-1', mockUser, { ip: '127.0.0.1' });
      expect(queue.add).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(CampaignStatus.RUNNING);
    });

    it('persists RUNNING status before enqueueing any job (race-condition guard)', async () => {
      campaignsRepo.findOne.mockResolvedValue({
        id: 'cmp-1', name: 'Test', status: CampaignStatus.DRAFT,
        owner: mockUser, ownerId: mockUser.id,
        smtpProfileId: 'smtp-1', templateId: 'template-1', landingPageId: null,
        startDate: new Date(), endDate: null, isAdaptive: false,
        emailsSent: 0, emailsOpened: 0, emailsClicked: 0, formsSubmitted: 0, bouncedEmails: 0,
        createdAt: new Date(), updatedAt: new Date(), totalRecipients: 2,
      });
      templatesRepo.findOne.mockResolvedValue({ id: 'template-1' });
      landingPagesRepo.findOne.mockResolvedValue(null);
      recipientsRepo.find.mockResolvedValue([
        { campaignId: 'cmp-1', email: 'a@test.com', trackingId: 't1' },
        { campaignId: 'cmp-1', email: 'b@test.com', trackingId: 't2' },
      ]);
      campaignsRepo.save.mockImplementation(async (v: any) => v);

      await service.launch('cmp-1', mockUser, { ip: '127.0.0.1' });

      // The campaign must be saved as RUNNING *before* the first job is added,
      // otherwise the processor skips jobs the worker picks up mid-launch.
      const runningSaveOrder = campaignsRepo.save.mock.calls
        .map((args: any[], i: number) => ({ status: args[0]?.status, order: campaignsRepo.save.mock.invocationCallOrder[i] }))
        .find((c: any) => c.status === CampaignStatus.RUNNING)?.order;
      const firstEnqueueOrder = queue.add.mock.invocationCallOrder[0];
      expect(runningSaveOrder).toBeDefined();
      expect(runningSaveOrder).toBeLessThan(firstEnqueueOrder);
    });
  });

  describe('delete', () => {
    it('deletes a draft campaign owned by the user', async () => {
      campaignsRepo.findOne.mockResolvedValue({
        id: 'cmp-1', name: 'Test', status: CampaignStatus.DRAFT, ownerId: mockUser.id,
      });
      await service.delete('cmp-1', mockUser, { ip: '127.0.0.1' });
      expect(campaignsRepo.remove).toHaveBeenCalled();
    });

    it('rejects deleting non-draft campaigns', async () => {
      campaignsRepo.findOne.mockResolvedValue({
        id: 'cmp-1', status: CampaignStatus.RUNNING, ownerId: mockUser.id,
      });
      await expect(service.delete('cmp-1', mockUser, { ip: '127.0.0.1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejects deleting another user's campaign", async () => {
      campaignsRepo.findOne.mockResolvedValue({
        id: 'cmp-1', status: CampaignStatus.DRAFT, ownerId: 'someone-else',
      });
      await expect(service.delete('cmp-1', mockUser, { ip: '127.0.0.1' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
