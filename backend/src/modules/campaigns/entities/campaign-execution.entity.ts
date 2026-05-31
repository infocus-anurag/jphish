import { Entity, Column, Index, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Campaign } from './campaign.entity';

export enum CampaignExecutionAction {
  EMAIL_SENT = 'email_sent',
  EMAIL_OPENED = 'email_opened',
  LINK_CLICKED = 'link_clicked',
  FORM_SUBMITTED = 'form_submitted',
  EMAIL_BOUNCED = 'email_bounced',
  EMAIL_BLOCKED = 'email_blocked',
}

@Entity('campaign_executions')
@Index(['campaignId', 'action'])
@Index(['campaignId', 'timestamp'])
@Index(['recipientEmail'])
@Index(['timestamp'])
export class CampaignExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  campaignId: string;

  @Column({ type: 'varchar', length: 254 })
  recipientEmail: string;

  @Column({
    type: 'enum',
    enum: CampaignExecutionAction,
  })
  action: CampaignExecutionAction;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    ip?: string;
    userAgent?: string;
    clickUrl?: string;
    location?: string;
    browser?: string;
    os?: string;
    deviceType?: string;
    bounceReason?: string;
    errorMessage?: string;
  } | null;

  @ManyToOne(() => Campaign, (campaign) => campaign.executions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;
}
