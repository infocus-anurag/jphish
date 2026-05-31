import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { CampaignsService } from '../services/campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto, AddRecipientsDto, ListCampaignsQueryDto } from '../dto/create-campaign.dto';
import { CampaignView } from '../serializers/campaign.serializer';
import { CampaignStatus } from '../enums/campaign-status.enum';
import { User } from '@/modules/auth/entities/user.entity';
import { UserRole } from '@/modules/auth/enums/user-role.enum';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Campaigns')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'campaigns', version: '1' })
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  private ctx(req: Request) {
    return { ip: req.ip, userAgent: req.get('user-agent') };
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  async create(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ): Promise<{ campaign: CampaignView }> {
    const campaign = await this.campaigns.create(dto, user, this.ctx(req));
    return { campaign };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List campaigns' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAll(
    @Query() query: ListCampaignsQueryDto,
    @CurrentUser() user: User,
  ): Promise<{ campaigns: CampaignView[]; total: number }> {
    const skip = query.skip ?? 0;
    const take = query.take ?? 50;
    const filters = query.status ? { status: query.status as CampaignStatus } : undefined;

    const [campaigns, total] = await this.campaigns.findAll(skip, take, filters);
    return { campaigns, total };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get campaign by ID' })
  async findById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ campaign: CampaignView }> {
    const campaign = await this.campaigns.findById(id);
    return { campaign };
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update campaign (only draft campaigns)' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ): Promise<{ campaign: CampaignView }> {
    const campaign = await this.campaigns.update(id, dto, user, this.ctx(req));
    return { campaign };
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete campaign (only draft campaigns)' })
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ): Promise<void> {
    await this.campaigns.delete(id, user, this.ctx(req));
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/launch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Launch campaign' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async launch(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ): Promise<{ campaign: CampaignView }> {
    const campaign = await this.campaigns.launch(id, user, this.ctx(req));
    return { campaign };
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause campaign' })
  async pause(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ): Promise<{ campaign: CampaignView }> {
    const campaign = await this.campaigns.pause(id, user, this.ctx(req));
    return { campaign };
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume paused campaign' })
  async resume(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ): Promise<{ campaign: CampaignView }> {
    const campaign = await this.campaigns.resume(id, user, this.ctx(req));
    return { campaign };
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':id/recipients')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add recipients to campaign' })
  async addRecipients(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddRecipientsDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    await this.campaigns.addRecipients(id, dto, user, this.ctx(req));
    return { message: `Added ${dto.recipients.length} recipients` };
  }

  @Get(':id/recipients')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get campaign recipients' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async getRecipients(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ): Promise<{ recipients: any[]; total: number }> {
    const [recipients, total] = await this.campaigns.getRecipients(id, skip ?? 0, take ?? 50);
    return { recipients, total };
  }
}
