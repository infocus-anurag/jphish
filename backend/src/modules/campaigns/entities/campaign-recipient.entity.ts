import { Entity, Column, Index, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Campaign } from './campaign.entity';

export enum CampaignRecipientStatus {
  PENDING = 'pending',
  SENT = 'sent',
  BOUNCED = 'bounced',
  UNSUBSCRIBED = 'unsubscribed',
  OPENED = 'opened',
  CLICKED = 'clicked',
  SUBMITTED = 'submitted',
  REPORTED = 'reported',
}

@Entity('campaign_recipients')
@Index(['campaignId', 'email'], { unique: true })
@Index(['campaignId', 'status'])
@Index(['email'])
export class CampaignRecipient {
  @PrimaryColumn('uuid')
  campaignId: string;

  @PrimaryColumn('varchar', { length: 254 })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  department: string | null;

  @Column({ type: 'uuid', nullable: true })
  groupId: string | null;

  @Column({
    type: 'enum',
    enum: CampaignRecipientStatus,
    default: CampaignRecipientStatus.PENDING,
  })
  status: CampaignRecipientStatus;

  // Unique per recipient: used for the open-pixel URL, click rewrite,
  // form submission, and report endpoints. Stored as plain string so the
  // public phish-server can resolve it without a DB join across UUIDs.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  trackingId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reportedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  openedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  clickedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  addedAt: Date;

  @ManyToOne(() => Campaign, (campaign) => campaign.recipients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;
}
