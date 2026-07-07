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
import { TenantsService } from '../services/tenants.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  UpdateTenantStatusDto,
} from '../dto/tenant.dto';
import { TenantStatus } from '../enums/tenant-status.enum';
import { UserRole } from '@/modules/auth/enums/user-role.enum';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

@ApiTags('Tenants')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a tenant (starts in PENDING)' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenants.create(dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'List tenants' })
  async findAll(
    @Query('skip') skip = '0',
    @Query('take') take = '50',
    @Query('status') status?: TenantStatus,
  ) {
    const [tenants, total] = await this.tenants.findAll(
      parseInt(skip, 10),
      parseInt(take, 10),
      status,
    );
    return { tenants, total };
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant by id' })
  findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tenants.findById(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant profile' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenants.update(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Change tenant lifecycle status' })
  changeStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTenantStatusDto,
  ) {
    return this.tenants.changeStatus(id, dto.status);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tenant' })
  async delete(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.tenants.delete(id);
  }
}
