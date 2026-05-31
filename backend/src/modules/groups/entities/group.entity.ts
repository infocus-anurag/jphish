import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/base.entity';
import { User } from '@/modules/auth/entities/user.entity';
import { GroupMember } from './group-member.entity';

@Entity('groups')
@Index(['createdById'])
@Index(['isActive'])
export class Group extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @OneToMany(() => GroupMember, (m) => m.group, { cascade: true, onDelete: 'CASCADE' })
  members: GroupMember[];
}
