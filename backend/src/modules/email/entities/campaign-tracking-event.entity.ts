import { Entity, Column, Index, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Campaign } from '@/modules/campaigns/entities/campaign.entity';
import { TrackingEventType } from '../enums/tracking-event-type.enum';

@Entity('campaign_tracking_events')
@Index(['campaignId', 'eventType'])
@Index(['campaignId', 'timestamp'])
@Index(['recipientEmail'])
@Index(['timestamp'])
@Index(['trackingId'])
export class CampaignTrackingEvent {
  @PrimaryColumn({ type: 'uuid' })
  campaignId: string;

  @PrimaryColumn({ type: 'varchar', length: 254 })
  recipientEmail: string;

  @PrimaryColumn({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'enum', enum: TrackingEventType })
  eventType: TrackingEventType;

  @Column({ type: 'uuid' })
  trackingId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @ManyToOne(() => Campaign, (campaign) => campaign.trackingEvents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;
}
