import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { GroupsService } from '../services/groups.service';
import { CreateGroupDto, UpdateGroupDto, AddMembersDto } from '../dto/group.dto';
import { User } from '@/modules/auth/entities/user.entity';
import { UserRole } from '@/modules/auth/enums/user-role.enum';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

@ApiTags('Groups')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'groups', version: '1' })
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a group of targets' })
  create(@Body() dto: CreateGroupDto, @CurrentUser() user: User) {
    return this.groups.create(dto, user);
  }

  @Get()
  async findAll(
    @Query('skip') skip = '0',
    @Query('take') take = '50',
  ) {
    const [groups, total] = await this.groups.findAll(parseInt(skip, 10), parseInt(take, 10));
    return { groups, total };
  }

  @Get(':id')
  findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.groups.findById(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGroupDto,
    @CurrentUser() user: User,
  ) {
    return this.groups.update(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: User) {
    await this.groups.delete(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST)
  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  addMembers(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddMembersDto,
  ) {
    return this.groups.addMembers(id, dto);
  }

  @Get(':id/members')
  listMembers(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.groups.listMembers(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST)
  @Delete(':id/members/:email')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('email') email: string,
  ) {
    await this.groups.removeMember(id, email);
  }
}
