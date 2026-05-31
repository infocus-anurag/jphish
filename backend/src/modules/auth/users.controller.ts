import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserRole } from './enums/user-role.enum';
import { UsersService } from './services/users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserRoleDto,
} from './dto/create-user.dto';
import { toUserView, UserView } from './serializers/user.serializer';
import type { User } from './entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  private ctx(req: Request) {
    return {
      ip: (req.ip || req.socket.remoteAddress || null) as string | null,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
    };
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ANALYST)
  @Get()
  async list(): Promise<UserView[]> {
    const list = await this.users.list();
    return list.map(toUserView);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post()
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: User,
    @Req() req: Request,
  ): Promise<{ user: UserView; tempPassword?: string }> {
    const { user, tempPassword } = await this.users.create(dto, actor, this.ctx(req));
    return { user: toUserView(user), tempPassword };
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: User,
    @Req() req: Request,
  ): Promise<UserView> {
    const updated = await this.users.update(id, dto, actor, this.ctx(req));
    return toUserView(updated);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id/role')
  async setRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() actor: User,
    @Req() req: Request,
  ): Promise<UserView> {
    const updated = await this.users.setRole(id, dto.role, actor, this.ctx(req));
    return toUserView(updated);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() actor: User,
    @Req() req: Request,
  ): Promise<void> {
    await this.users.remove(id, actor, this.ctx(req));
  }
}
