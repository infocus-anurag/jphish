import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { JwtAccessPayload } from '../strategies/jwt.strategy';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken) private readonly tokens: Repository<RefreshToken>,
  ) {}

  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseExpiry(env: string, fallback: string): number {
    const v = this.config.get<string>(env, fallback);
    const m = /^(\d+)\s*([smhd])$/.exec(v.trim());
    if (!m) throw new Error(`Bad duration "${v}" for ${env}`);
    const n = Number(m[1]);
    switch (m[2]) {
      case 's': return n * 1000;
      case 'm': return n * 60_000;
      case 'h': return n * 3_600_000;
      case 'd': return n * 86_400_000;
      default: throw new Error(`Bad duration "${v}"`);
    }
  }

  signAccessToken(user: User): string {
    const pwdAt = user.passwordChangedAt
      ? Math.floor(user.passwordChangedAt.getTime() / 1000)
      : 0;
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      pwdAt,
    };
    const expiresIn = this.config.get<string>('JWT_ACCESS_EXPIRY', '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`;
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn,
      algorithm: 'HS256',
    });
  }

  /** Create initial refresh token (new family). */
  async issueRefreshFamily(
    user: User,
    ctx: { ip?: string | null; userAgent?: string | null },
  ): Promise<{ refreshToken: string; expiresAt: Date }> {
    const familyId = crypto.randomUUID();
    return this.mintRefresh(user.id, familyId, ctx);
  }

  /**
   * Rotate a refresh token. Returns null on a token that doesn't exist, was
   * already revoked (reuse → caller should revoke whole family), is expired,
   * or belongs to an inactive user.
   */
  async rotateRefresh(
    presentedToken: string,
    ctx: { ip?: string | null; userAgent?: string | null },
  ): Promise<{
    user: User;
    refreshToken: string;
    expiresAt: Date;
    reuseDetected: boolean;
  } | null> {
    const presentedHash = this.hash(presentedToken);
    const row = await this.tokens.findOne({
      where: { tokenHash: presentedHash },
      relations: { user: true },
    });
    if (!row) return null;

    if (row.revokedAt) {
      // Reuse of a revoked token: nuke the entire family for this user.
      await this.revokeFamily(row.familyId);
      return { user: row.user, refreshToken: '', expiresAt: new Date(0), reuseDetected: true };
    }
    if (row.expiresAt.getTime() < Date.now()) return null;
    if (!row.user.isActive) return null;

    const fresh = await this.mintRefresh(row.userId, row.familyId, ctx);
    await this.tokens.update(row.id, {
      revokedAt: new Date(),
      replacedById: await this.findIdByHash(this.hash(fresh.refreshToken)),
    });
    return { user: row.user, ...fresh, reuseDetected: false };
  }

  private async findIdByHash(hash: string): Promise<string | null> {
    const r = await this.tokens.findOne({ where: { tokenHash: hash } });
    return r?.id ?? null;
  }

  private async mintRefresh(
    userId: string,
    familyId: string,
    ctx: { ip?: string | null; userAgent?: string | null },
  ): Promise<{ refreshToken: string; expiresAt: Date }> {
    const raw = crypto.randomBytes(48).toString('base64url');
    const ttlMs = this.parseExpiry('JWT_REFRESH_EXPIRY', '7d');
    const expiresAt = new Date(Date.now() + ttlMs);
    await this.tokens.insert({
      userId,
      familyId,
      tokenHash: this.hash(raw),
      expiresAt,
      userAgent: ctx.userAgent?.slice(0, 255) ?? null,
      ip: ctx.ip ?? null,
    });
    return { refreshToken: raw, expiresAt };
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.tokens.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async revokeByToken(token: string): Promise<void> {
    const row = await this.tokens.findOne({ where: { tokenHash: this.hash(token) } });
    if (row && !row.revokedAt) {
      await this.tokens.update(row.id, { revokedAt: new Date() });
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.tokens.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  /** GC helper — call from a cron later if you want. */
  async purgeExpired(): Promise<number> {
    const res = await this.tokens
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .execute();
    return res.affected ?? 0;
  }

}
