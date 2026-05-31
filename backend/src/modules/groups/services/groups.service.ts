import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../entities/group.entity';
import { GroupMember } from '../entities/group-member.entity';
import { CreateGroupDto, UpdateGroupDto, AddMembersDto, GroupMemberDto } from '../dto/group.dto';
import { User } from '@/modules/auth/entities/user.entity';
import { UserRole } from '@/modules/auth/enums/user-role.enum';

export interface GroupView {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  memberCount: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private groups: Repository<Group>,
    @InjectRepository(GroupMember) private members: Repository<GroupMember>,
  ) {}

  async create(dto: CreateGroupDto, creator: User): Promise<GroupView> {
    const exists = await this.groups.findOne({ where: { name: dto.name } });
    if (exists) {
      throw new ConflictException('A group with this name already exists');
    }

    const group = this.groups.create({
      name: dto.name,
      description: dto.description ?? null,
      createdById: creator.id,
    });
    const saved = await this.groups.save(group);

    if (dto.members?.length) {
      await this.upsertMembers(saved.id, dto.members);
    }

    return this.toView(saved);
  }

  async findAll(skip = 0, take = 50): Promise<[GroupView[], number]> {
    const [rows, total] = await this.groups.findAndCount({
      skip,
      take,
      order: { createdAt: 'DESC' },
    });

    const counts = await Promise.all(
      rows.map((g) => this.members.count({ where: { groupId: g.id } })),
    );
    return [rows.map((g, i) => this.toView(g, counts[i])), total];
  }

  async findById(id: string): Promise<GroupView & { members: GroupMember[] }> {
    const group = await this.groups.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Group not found');
    const members = await this.members.find({
      where: { groupId: id },
      order: { addedAt: 'DESC' },
    });
    return { ...this.toView(group, members.length), members };
  }

  async update(id: string, dto: UpdateGroupDto, user: User): Promise<GroupView> {
    const group = await this.groups.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.createdById !== user.id && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('You can only update groups you own');
    }
    if (dto.name && dto.name !== group.name) {
      const exists = await this.groups.findOne({ where: { name: dto.name } });
      if (exists) throw new ConflictException('Name already in use');
    }
    Object.assign(group, dto);
    const saved = await this.groups.save(group);
    return this.toView(saved);
  }

  async delete(id: string, user: User): Promise<void> {
    const group = await this.groups.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.createdById !== user.id && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('You can only delete groups you own');
    }
    await this.groups.remove(group);
  }

  async addMembers(id: string, dto: AddMembersDto): Promise<{ added: number }> {
    const group = await this.groups.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Group not found');
    const added = await this.upsertMembers(id, dto.members);
    return { added };
  }

  async removeMember(groupId: string, email: string): Promise<void> {
    const member = await this.members.findOne({ where: { groupId, email } });
    if (!member) throw new NotFoundException('Member not found');
    await this.members.remove(member);
  }

  async listMembers(groupId: string): Promise<GroupMember[]> {
    return this.members.find({ where: { groupId }, order: { addedAt: 'DESC' } });
  }

  private async upsertMembers(groupId: string, list: GroupMemberDto[]): Promise<number> {
    const existing = (await this.members.find({ where: { groupId }, select: ['email'] })).map((m) =>
      m.email.toLowerCase(),
    );
    const fresh = list.filter((m) => !existing.includes(m.email.toLowerCase()));
    if (fresh.length === 0) return 0;
    const rows = fresh.map((m) =>
      this.members.create({
        groupId,
        email: m.email,
        firstName: m.firstName ?? null,
        lastName: m.lastName ?? null,
        department: m.department ?? null,
        position: m.position ?? null,
      }),
    );
    await this.members.save(rows);
    return rows.length;
  }

  private toView(g: Group, memberCount = 0): GroupView {
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      isActive: g.isActive,
      memberCount,
      createdById: g.createdById,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  }
}
