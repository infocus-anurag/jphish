import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/base.entity';
import { User } from '@/modules/auth/entities/user.entity';
import { CampaignStatus } from '../enums/campaign-status.enum';
import { CampaignRecipient } from './campaign-recipient.entity';
import { CampaignExecution } from './campaign-execution.entity';
import { SmtpProfile } from '@/modules/email/entities/smtp-profile.entity';
import { CampaignTrackingEvent } from '@/modules/email/entities/campaign-tracking-event.entity';

@Entity('campaigns')
@Index(['ownerId'])
@Index(['status'])
@Index(['createdAt'])
export class Campaign extends BaseEntity {
  @Column({ length: 255, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Column({ type: 'uuid' })
  templateId: string;

  @Column({ type: 'uuid' })
  ownerId: string;

  @Column({ type: 'uuid', nullable: true })
  smtpProfileId: string | null;

  @Column({ type: 'uuid', nullable: true })
  landingPageId: string | null;

  @Column({ type: 'uuid', nullable: true })
  groupId: string | null;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date | null;

  @Column({ type: 'boolean', default: false })
  isAdaptive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  launchedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  totalRecipients: number;

  @Column({ type: 'int', default: 0 })
  emailsSent: number;

  @Column({ type: 'int', default: 0 })
  emailsOpened: number;

  @Column({ type: 'int', default: 0 })
  emailsClicked: number;

  @Column({ type: 'int', default: 0 })
  formsSubmitted: number;

  @Column({ type: 'int', default: 0 })
  bouncedEmails: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @ManyToOne(() => SmtpProfile, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'smtpProfileId' })
  smtpProfile: SmtpProfile;

  @OneToMany(() => CampaignRecipient, (recipient) => recipient.campaign, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  recipients: CampaignRecipient[];

  @OneToMany(() => CampaignExecution, (execution) => execution.campaign, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  executions: CampaignExecution[];

  @OneToMany(() => CampaignTrackingEvent, (event) => event.campaign, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  trackingEvents: CampaignTrackingEvent[];
}
