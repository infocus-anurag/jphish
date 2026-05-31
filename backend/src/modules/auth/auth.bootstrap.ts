import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';

/**
 * On startup, if the users table is empty, create one super-admin from
 * BOOTSTRAP_SUPERADMIN_EMAIL/PASSWORD. The seeded account is flagged
 * `mustChangePassword=true` so the operator is forced to rotate it.
 */
@Injectable()
export class AuthBootstrap implements OnModuleInit {
  private readonly logger = new Logger(AuthBootstrap.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.users.count();
    if (count > 0) return;

    const email = this.config.get<string>('BOOTSTRAP_SUPERADMIN_EMAIL');
    const password = this.config.get<string>('BOOTSTRAP_SUPERADMIN_PASSWORD');
    if (!email || !password) {
      this.logger.warn(
        'No users in DB and BOOTSTRAP_SUPERADMIN_* not set — login will be impossible until a user is created.',
      );
      return;
    }

    const rounds = Number(this.config.get('BCRYPT_ROUNDS', 12));
    const passwordHash = await bcrypt.hash(password, rounds);
    await this.users.insert({
      email: email.trim().toLowerCase(),
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      passwordHash,
      isActive: true,
      mustChangePassword: true,
      passwordChangedAt: new Date(),
    });
    this.logger.warn(
      `Bootstrap super-admin created: ${email} (must change password on first login).`,
    );
  }
}
