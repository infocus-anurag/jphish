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
import { PlansService } from '../services/plans.service';
import { CreatePlanDto, UpdatePlanDto } from '../dto/plan.dto';
import { UserRole } from '@/modules/auth/enums/user-role.enum';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

@ApiTags('Plans')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'plans', version: '1' })
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'List subscription plans' })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.plans.findAll(includeInactive === 'true');
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get a plan by id' })
  findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.plans.findById(id);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a plan (multiple allowed only for the CUSTOM tier)' })
  create(@Body() dto: CreatePlanDto) {
    return this.plans.create(dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a plan' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdatePlanDto) {
    return this.plans.update(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a plan (only if no tenant is assigned to it)' })
  async delete(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.plans.delete(id);
  }
}
