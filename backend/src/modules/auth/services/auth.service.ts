import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { TokensService } from './tokens.service';
import { AuditService, AuditContext } from './audit.service';
import { ChangePasswordDto } from '../dto/change-password.dto';

export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly tokens: TokensService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  private get maxFails(): number {
    return Number(this.config.get('AUTH_MAX_FAILED_ATTEMPTS', 5));
  }

  private get lockoutMs(): number {
    return Number(this.config.get('AUTH_LOCKOUT_MINUTES', 15)) * 60_000;
  }

  /**
   * Constant-time-ish login: we always run a bcrypt compare (against a fixed
   * dummy hash if the user doesn't exist) so attackers can't user-enumerate
   * via response timing.
   */
  async login(
    rawEmail: string,
    rawPassword: string,
    ctx: AuditContext,
  ): Promise<LoginResult> {
    const email = rawEmail.trim().toLowerCase();
    const user = await this.users.findOne({ where: { email } });

    const dummy = '$2b$12$abcdefghijklmnopqrstuuJjE7mqwUaP.JhT2nF.uJYpJgWzm4vKzC';
    const hash = user?.passwordHash ?? dummy;
    const ok = await bcrypt.compare(rawPassword, hash);

    if (!user || !user.isActive) {
      await this.audit.record({
        action: 'auth.login.failed',
        actorEmail: email,
        metadata: { reason: !user ? 'unknown_user' : 'inactive' },
        ctx,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      await this.audit.record({
        action: 'auth.login.locked',
        actorId: user.id,
        actorEmail: email,
        ctx,
      });
      throw new UnauthorizedException(
        'Account temporarily locked. Try again later.',
      );
    }

    if (!ok) {
      const fails = user.failedLoginAttempts + 1;
      const patch: Partial<User> = { failedLoginAttempts: fails };
      if (fails >= this.maxFails) {
        patch.lockedUntil = new Date(Date.now() + this.lockoutMs);
        patch.failedLoginAttempts = 0;
      }
      await this.users.update(user.id, patch);
      await this.audit.record({
        action: 'auth.login.failed',
        actorId: user.id,
        actorEmail: email,
        metadata: { reason: 'bad_password', fails },
        ctx,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.users.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ctx.ip ?? null,
    });
    user.lastLoginAt = new Date();

    const accessToken = this.tokens.signAccessToken(user);
    const { refreshToken, expiresAt } = await this.tokens.issueRefreshFamily(user, ctx);

    await this.audit.record({
      action: 'auth.login.success',
      actorId: user.id,
      actorEmail: user.email,
      ctx,
    });

    return { user, accessToken, refreshToken, refreshExpiresAt: expiresAt };
  }

  async refresh(
    presentedRefreshToken: string,
    ctx: AuditContext,
  ): Promise<LoginResult> {
    const result = await this.tokens.rotateRefresh(presentedRefreshToken, ctx);
    if (!result) throw new UnauthorizedException('Invalid refresh token');

    if (result.reuseDetected) {
      await this.audit.record({
        action: 'auth.refresh.reuse_detected',
        actorId: result.user.id,
        actorEmail: result.user.email,
        ctx,
      });
      throw new UnauthorizedException(
        'Token reuse detected — all sessions have been revoked.',
      );
    }

    if (!result.user.isActive) throw new ForbiddenException('Account inactive');

    const accessToken = this.tokens.signAccessToken(result.user);
    await this.audit.record({
      action: 'auth.refresh.success',
      actorId: result.user.id,
      actorEmail: result.user.email,
      ctx,
    });

    return {
      user: result.user,
      accessToken,
      refreshToken: result.refreshToken,
      refreshExpiresAt: result.expiresAt,
    };
  }

  async logout(presentedRefreshToken: string | undefined, user: User, ctx: AuditContext): Promise<void> {
    if (presentedRefreshToken) {
      await this.tokens.revokeByToken(presentedRefreshToken);
    }
    await this.audit.record({
      action: 'auth.logout',
      actorId: user.id,
      actorEmail: user.email,
      ctx,
    });
  }

  async changePassword(user: User, dto: ChangePasswordDto, ctx: AuditContext): Promise<void> {
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    if (dto.currentPassword === dto.newPassword) {
      throw new UnauthorizedException('New password must differ from the current password');
    }

    const rounds = Number(this.config.get('BCRYPT_ROUNDS', 12));
    const passwordHash = await bcrypt.hash(dto.newPassword, rounds);
    const passwordChangedAt = new Date();

    await this.users.update(user.id, {
      passwordHash,
      passwordChangedAt,
      mustChangePassword: false,
    });
    // Invalidate every refresh token for the user — every session must re-login.
    await this.tokens.revokeAllForUser(user.id);
    await this.audit.record({
      action: 'auth.password.changed',
      actorId: user.id,
      actorEmail: user.email,
      ctx,
    });
  }
}
