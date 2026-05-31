import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';
import { CreateUserDto, UpdateUserDto } from '../dto/create-user.dto';
import { TokensService } from './tokens.service';
import { AuditService, AuditContext } from './audit.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly tokens: TokensService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  list(): Promise<User[]> {
    return this.users.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<User> {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  async create(dto: CreateUserDto, actor: User, ctx: AuditContext): Promise<{ user: User; tempPassword?: string }> {
    if (dto.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only a super-admin can create another super-admin');
    }

    const exists = await this.users.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('A user with this email already exists');

    let plain = dto.password;
    let mustChangePassword = false;
    if (!plain) {
      plain = this.generateTempPassword();
      mustChangePassword = true;
    }
    const rounds = Number(this.config.get('BCRYPT_ROUNDS', 12));
    const passwordHash = await bcrypt.hash(plain, rounds);

    const user = this.users.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      passwordHash,
      mustChangePassword,
      passwordChangedAt: new Date(),
      isActive: true,
    });
    const saved = await this.users.save(user);
    await this.audit.record({
      action: 'user.created',
      actorId: actor.id,
      actorEmail: actor.email,
      targetId: saved.id,
      metadata: { role: saved.role, email: saved.email },
      ctx,
    });

    return { user: saved, tempPassword: dto.password ? undefined : plain };
  }

  async update(id: string, dto: UpdateUserDto, actor: User, ctx: AuditContext): Promise<User> {
    const target = await this.findById(id);
    if (target.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only a super-admin can modify a super-admin');
    }

    const previousActive = target.isActive;
    Object.assign(target, dto);
    const saved = await this.users.save(target);

    if (typeof dto.isActive === 'boolean' && dto.isActive !== previousActive) {
      if (!dto.isActive) {
        await this.tokens.revokeAllForUser(saved.id);
        await this.audit.record({
          action: 'user.deactivated',
          actorId: actor.id,
          actorEmail: actor.email,
          targetId: saved.id,
          ctx,
        });
      } else {
        await this.audit.record({
          action: 'user.activated',
          actorId: actor.id,
          actorEmail: actor.email,
          targetId: saved.id,
          ctx,
        });
      }
    }
    return saved;
  }

  async setRole(id: string, role: UserRole, actor: User, ctx: AuditContext): Promise<User> {
    if (id === actor.id) {
      throw new BadRequestException('You cannot change your own role');
    }
    const target = await this.findById(id);
    const previous = target.role;

    // Only a super-admin can mint or demote another super-admin.
    if ((role === UserRole.SUPER_ADMIN || target.role === UserRole.SUPER_ADMIN) &&
        actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only a super-admin can change super-admin status');
    }

    // Prevent demoting the last remaining super-admin.
    if (target.role === UserRole.SUPER_ADMIN && role !== UserRole.SUPER_ADMIN) {
      const remaining = await this.users.count({
        where: { role: UserRole.SUPER_ADMIN, isActive: true },
      });
      if (remaining <= 1) {
        throw new BadRequestException(
          'At least one active super-admin must remain in the system',
        );
      }
    }

    target.role = role;
    const saved = await this.users.save(target);
    // Force the user to re-authenticate with the new role baked in.
    await this.tokens.revokeAllForUser(saved.id);
    await this.audit.record({
      action: 'user.role.updated',
      actorId: actor.id,
      actorEmail: actor.email,
      targetId: saved.id,
      metadata: { from: previous, to: role },
      ctx,
    });
    return saved;
  }

  async remove(id: string, actor: User, ctx: AuditContext): Promise<void> {
    if (id === actor.id) throw new BadRequestException('You cannot delete yourself');
    const target = await this.findById(id);
    if (target.role === UserRole.SUPER_ADMIN) {
      const remaining = await this.users.count({
        where: { role: UserRole.SUPER_ADMIN, isActive: true },
      });
      if (remaining <= 1) {
        throw new BadRequestException(
          'At least one active super-admin must remain in the system',
        );
      }
    }
    await this.users.delete(target.id);
    await this.tokens.revokeAllForUser(target.id);
    await this.audit.record({
      action: 'user.deleted',
      actorId: actor.id,
      actorEmail: actor.email,
      targetId: target.id,
      metadata: { email: target.email },
      ctx,
    });
  }

  /** 16 random base64url chars → ~96 bits, then pad with required-class chars. */
  private generateTempPassword(): string {
    const random = crypto.randomBytes(12).toString('base64url');
    return `Tmp1!${random}`;
  }
}
