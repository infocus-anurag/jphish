import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EmailTemplate } from '../entities/email-template.entity';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from '../dto';
import { User } from '@/modules/auth/entities/user.entity';
import { UserRole } from '@/modules/auth/enums/user-role.enum';
import { AuditService, AuditContext } from '@/modules/auth/services/audit.service';

@Injectable()
export class EmailTemplateService {
  constructor(
    @InjectRepository(EmailTemplate) private templates: Repository<EmailTemplate>,
    private audit: AuditService,
  ) {}

  async create(
    dto: CreateEmailTemplateDto,
    creator: User,
    ctx: AuditContext,
  ): Promise<EmailTemplate> {
    const exists = await this.templates.findOne({ where: { name: dto.name } });
    if (exists) {
      throw new ConflictException('An email template with this name already exists');
    }

    const template = this.templates.create({
      ...dto,
      createdById: creator.id,
    });

    const saved = await this.templates.save(template);

    await this.audit.record({
      action: 'email_template.created',
      actorId: creator.id,
      targetId: saved.id,
      ctx,
      metadata: { name: saved.name, type: saved.type },
    });

    return saved;
  }

  async findAll(skip = 0, take = 50): Promise<[EmailTemplate[], number]> {
    return this.templates.findAndCount({
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<EmailTemplate> {
    const template = await this.templates.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Email template not found');
    }
    return template;
  }

  async update(
    id: string,
    dto: UpdateEmailTemplateDto,
    user: User,
    ctx: AuditContext,
  ): Promise<EmailTemplate> {
    const template = await this.templates.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Email template not found');
    }

    if (template.createdById !== user.id && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('You can only update templates you created');
    }

    if (dto.name && dto.name !== template.name) {
      const exists = await this.templates.findOne({ where: { name: dto.name } });
      if (exists) {
        throw new ConflictException('An email template with this name already exists');
      }
    }

    Object.assign(template, dto);
    const updated = await this.templates.save(template);

    await this.audit.record({
      action: 'email_template.updated',
      actorId: user.id,
      targetId: id,
      ctx,
      metadata: { changes: dto },
    });

    return updated;
  }

  async delete(id: string, user: User, ctx: AuditContext): Promise<void> {
    const template = await this.templates.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Email template not found');
    }

    if (template.createdById !== user.id && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('You can only delete templates you created');
    }

    await this.templates.remove(template);

    await this.audit.record({
      action: 'email_template.deleted',
      actorId: user.id,
      targetId: id,
      ctx,
      metadata: { name: template.name },
    });
  }

  renderTemplate(
    template: EmailTemplate,
    variables: Record<string, string>,
  ): { subject: string; html: string; text: string | null } {
    let subject = template.subject;
    let html = template.htmlContent;
    let text = template.textContent;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      subject = subject.replace(regex, value);
      html = html.replace(regex, value);
      if (text) {
        text = text.replace(regex, value);
      }
    }

    return { subject, html, text };
  }

  validateVariables(template: EmailTemplate, variables: Record<string, string>): void {
    for (const variable of template.variables) {
      if (!variables[variable]) {
        throw new BadRequestException(`Missing required variable: ${variable}`);
      }
    }
  }
}
