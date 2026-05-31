import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/base.entity';
import { User } from '@/modules/auth/entities/user.entity';

export enum LandingPageCapture {
  NONE = 'none',
  CREDENTIALS = 'credentials',
  CREDENTIALS_OTP = 'credentials_otp',
  CUSTOM = 'custom',
}

@Entity('landing_pages')
@Index(['createdById'])
@Index(['slug'], { unique: true })
@Index(['isActive'])
export class LandingPage extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  // URL slug used for the public phish URL: /p/:slug/:trackingId
  @Column({ type: 'varchar', length: 64 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text' })
  htmlContent: string;

  @Column({ type: 'enum', enum: LandingPageCapture, default: LandingPageCapture.CREDENTIALS })
  captureType: LandingPageCapture;

  // Where to redirect the target after they submit the form (typically a
  // training/awareness page). Optional.
  @Column({ type: 'text', nullable: true })
  redirectUrl: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;
}
