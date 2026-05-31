import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction, AuditLog } from '../entities/audit-log.entity';

export interface AuditContext {
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>,
  ) {}

  async record(params: {
    action: AuditAction;
    actorId?: string | null;
    actorEmail?: string | null;
    targetId?: string | null;
    metadata?: Record<string, unknown> | null;
    ctx?: AuditContext;
  }): Promise<void> {
    try {
      const row = this.logs.create({
        action: params.action,
        actorId: params.actorId ?? null,
        actorEmail: params.actorEmail ?? null,
        targetId: params.targetId ?? null,
        metadata: params.metadata ?? null,
        ip: params.ctx?.ip ?? null,
        userAgent: params.ctx?.userAgent?.slice(0, 255) ?? null,
      });
      await this.logs.save(row);
    } catch (err) {
      // Audit failures must never break a request.
      this.logger.error(`Failed to write audit log ${params.action}`, err as Error);
    }
  }

  async list(limit = 100): Promise<AuditLog[]> {
    return this.logs.find({ order: { createdAt: 'DESC' }, take: Math.min(limit, 500) });
  }
}
