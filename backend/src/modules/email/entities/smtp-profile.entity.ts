import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/base.entity';
import { User } from '@/modules/auth/entities/user.entity';

@Entity('smtp_profiles')
@Index(['createdById'])
@Index(['isActive'])
export class SmtpProfile extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  host: string;

  @Column({ type: 'int' })
  port: number;

  @Column({ type: 'boolean', default: false })
  secure: boolean;

  @Column({ type: 'varchar', length: 255 })
  user: string;

  @Column({ type: 'text' })
  password: string;

  @Column({ type: 'varchar', length: 254 })
  fromEmail: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fromName: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  createdById: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastTestedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  testSuccessful: boolean;

  @Column({ type: 'text', nullable: true })
  testError: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;
}
