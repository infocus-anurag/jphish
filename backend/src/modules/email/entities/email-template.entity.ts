import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/base.entity';
import { User } from '@/modules/auth/entities/user.entity';
import { EmailTemplateType } from '../enums/email-template-type.enum';

@Entity('email_templates')
@Index(['createdById'])
@Index(['type'])
@Index(['isActive'])
export class EmailTemplate extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  htmlContent: string;

  @Column({ type: 'text', nullable: true })
  textContent: string | null;

  @Column({ type: 'enum', enum: EmailTemplateType, default: EmailTemplateType.PHISHING })
  type: EmailTemplateType;

  @Column({ type: 'simple-json', nullable: false })
  variables: string[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;
}
