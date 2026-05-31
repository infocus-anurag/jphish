import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuditLog } from './entities/audit-log.entity';

import { AuthController } from './auth.controller';
import { UsersController } from './users.controller';
import { AuditController } from './audit.controller';

import { AuthService } from './services/auth.service';
import { UsersService } from './services/users.service';
import { TokensService } from './services/tokens.service';
import { AuditService } from './services/audit.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthBootstrap } from './auth.bootstrap';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Access tokens are HS256 signed with JWT_ACCESS_SECRET. TokensService also
    // passes the secret/expiry explicitly per-sign, and JwtStrategy verifies
    // with the same secret — keep all three aligned on JWT_ACCESS_SECRET.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: config.get('JWT_ACCESS_EXPIRY', '15m') },
      }),
    }),
    TypeOrmModule.forFeature([User, RefreshToken, AuditLog]),
  ],
  controllers: [AuthController, UsersController, AuditController],
  providers: [
    AuthService,
    UsersService,
    TokensService,
    AuditService,
    JwtStrategy,
    AuthBootstrap,
  ],
  // Feature modules import AuthModule to reuse the registered JWT/Passport
  // stack and the guards (JwtAuthGuard/RolesGuard) on their controllers, plus
  // AuditService so Campaigns/Email services can record audit-log entries.
  exports: [PassportModule, JwtModule, AuditService],
})
export class AuthModule {}
