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
import { LandingPageService } from '../services/landing-page.service';
import { LandingCloneService } from '../services/landing-clone.service';
import {
  CreateLandingPageDto,
  UpdateLandingPageDto,
  CloneLandingPageDto,
} from '../dto/landing-page.dto';
import { User } from '@/modules/auth/entities/user.entity';
import { UserRole } from '@/modules/auth/enums/user-role.enum';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

@ApiTags('Landing pages')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'landing-pages', version: '1' })
export class LandingPagesController {
  constructor(
    private readonly pages: LandingPageService,
    private readonly cloneService: LandingCloneService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a landing page' })
  create(@Body() dto: CreateLandingPageDto, @CurrentUser() user: User) {
    return this.pages.create(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('clone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clone a public web page into landing-page HTML' })
  clone(@Body() dto: CloneLandingPageDto) {
    return this.cloneService.clone(dto.url);
  }

  @Get()
  async findAll(@Query('skip') skip = '0', @Query('take') take = '50') {
    const [items, total] = await this.pages.findAll(parseInt(skip, 10), parseInt(take, 10));
    return { items, total };
  }

  @Get(':id')
  findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.pages.findById(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLandingPageDto,
    @CurrentUser() user: User,
  ) {
    return this.pages.update(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: User) {
    await this.pages.delete(id, user);
  }
}
