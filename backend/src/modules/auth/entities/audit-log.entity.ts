import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export type AuditAction =
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'auth.login.locked'
  | 'auth.logout'
  | 'auth.refresh.success'
  | 'auth.refresh.reuse_detected'
  | 'auth.password.changed'
  | 'user.created'
  | 'user.role.updated'
  | 'user.deactivated'
  | 'user.activated'
  | 'user.deleted'
  | 'campaign.created'
  | 'campaign.updated'
  | 'campaign.deleted'
  | 'campaign.launched'
  | 'campaign.paused'
  | 'campaign.resumed'
  | 'campaign.recipients_added'
  | 'smtp_profile.created'
  | 'smtp_profile.updated'
  | 'smtp_profile.deleted'
  | 'smtp_profile.tested'
  | 'email_template.created'
  | 'email_template.updated'
  | 'email_template.deleted'
  | 'email_template.tested'
  | 'landing_page.created'
  | 'landing_page.updated'
  | 'landing_page.deleted'
  | 'group.created'
  | 'group.updated'
  | 'group.deleted';

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Index()
  @Column({ name: 'actor_id', type: 'varchar', nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_email', type: 'varchar', length: 254, nullable: true })
  actorEmail: string | null;

  @Index()
  @Column({ length: 64 })
  action: AuditAction;

  @Column({ name: 'target_id', type: 'varchar', nullable: true })
  targetId: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
