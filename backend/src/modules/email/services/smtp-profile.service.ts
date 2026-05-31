import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmtpProfile } from '../entities/smtp-profile.entity';
import { CreateSmtpProfileDto, UpdateSmtpProfileDto, TestSmtpProfileDto } from '../dto/create-smtp-profile.dto';
import { User } from '@/modules/auth/entities/user.entity';
import { UserRole } from '@/modules/auth/enums/user-role.enum';
import { AuditService, AuditContext } from '@/modules/auth/services/audit.service';
import { EmailService } from './email.service';

@Injectable()
export class SmtpProfileService {
  constructor(
    @InjectRepository(SmtpProfile) private profiles: Repository<SmtpProfile>,
    private emailService: EmailService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateSmtpProfileDto, creator: User, ctx: AuditContext): Promise<SmtpProfile> {
    const exists = await this.profiles.findOne({ where: { name: dto.name } });
    if (exists) {
      throw new ConflictException('An SMTP profile with this name already exists');
    }

    const profile = this.profiles.create({
      ...dto,
      createdById: creator.id,
    });

    const saved = await this.profiles.save(profile);

    await this.audit.record({
      action: 'smtp_profile.created',
      actorId: creator.id,
      targetId: saved.id,
      ctx,
      metadata: { name: saved.name, host: saved.host },
    });

    return this.sanitize(saved);
  }

  async findAll(skip = 0, take = 50): Promise<[SmtpProfile[], number]> {
    const [profiles, total] = await this.profiles.findAndCount({
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
    return [profiles.map((p) => this.sanitize(p)), total];
  }

  async findById(id: string): Promise<SmtpProfile> {
    const profile = await this.profiles.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException('SMTP profile not found');
    }
    return this.sanitize(profile);
  }

  async update(id: string, dto: UpdateSmtpProfileDto, user: User, ctx: AuditContext): Promise<SmtpProfile> {
    const profile = await this.profiles.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException('SMTP profile not found');
    }

    if (profile.createdById !== user.id && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('You can only update SMTP profiles you created');
    }

    if (dto.name && dto.name !== profile.name) {
      const exists = await this.profiles.findOne({ where: { name: dto.name } });
      if (exists) {
        throw new ConflictException('An SMTP profile with this name already exists');
      }
    }

    Object.assign(profile, dto);
    const updated = await this.profiles.save(profile);

    await this.audit.record({
      action: 'smtp_profile.updated',
      actorId: user.id,
      targetId: id,
      ctx,
      metadata: { changes: dto },
    });

    return this.sanitize(updated);
  }

  async delete(id: string, user: User, ctx: AuditContext): Promise<void> {
    const profile = await this.profiles.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException('SMTP profile not found');
    }

    if (profile.createdById !== user.id && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('You can only delete SMTP profiles you created');
    }

    await this.profiles.remove(profile);

    await this.audit.record({
      action: 'smtp_profile.deleted',
      actorId: user.id,
      targetId: id,
      ctx,
      metadata: { name: profile.name },
    });
  }

  async test(id: string, dto: TestSmtpProfileDto, user: User, ctx: AuditContext): Promise<SmtpProfile> {
    const profile = await this.profiles.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException('SMTP profile not found');
    }

    try {
      await this.emailService.testSmtpConnection(profile);
      profile.testSuccessful = true;
      profile.testError = null;
      profile.lastTestedAt = new Date();
    } catch (error) {
      profile.testSuccessful = false;
      profile.testError = error instanceof Error ? error.message : String(error);
      profile.lastTestedAt = new Date();
    }

    const updated = await this.profiles.save(profile);

    await this.audit.record({
      action: 'smtp_profile.tested',
      actorId: user.id,
      targetId: id,
      ctx,
      metadata: { successful: updated.testSuccessful },
    });

    return this.sanitize(updated);
  }

  private sanitize(profile: SmtpProfile): SmtpProfile {
    const sanitized = { ...profile };
    (sanitized as any).password = undefined;
    return sanitized as SmtpProfile;
  }
}
