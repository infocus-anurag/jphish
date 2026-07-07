import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  MaxLength,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { PlanTier } from '../enums/plan-tier.enum';
import { TenantFeature } from '../enums/tenant-feature.enum';

// Limits use -1 for "unlimited"; anything below that is meaningless.
const UNLIMITED = -1;

export class CreatePlanDto {
  @ApiProperty({ enum: PlanTier })
  @IsEnum(PlanTier)
  tier: PlanTier;

  @ApiProperty({ example: 'Professional' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Max users; -1 = unlimited' })
  @IsInt()
  @Min(UNLIMITED)
  maxUsers: number;

  @ApiProperty({ description: 'Max campaigns; -1 = unlimited' })
  @IsInt()
  @Min(UNLIMITED)
  maxCampaigns: number;

  @ApiProperty({ description: 'Max templates; -1 = unlimited' })
  @IsInt()
  @Min(UNLIMITED)
  maxTemplates: number;

  @ApiProperty({ description: 'Max landing pages; -1 = unlimited' })
  @IsInt()
  @Min(UNLIMITED)
  maxLandingPages: number;

  @ApiProperty({ description: 'Max sending profiles; -1 = unlimited' })
  @IsInt()
  @Min(UNLIMITED)
  maxSendingProfiles: number;

  @ApiProperty({ description: 'Emails per period; -1 = unlimited' })
  @IsInt()
  @Min(UNLIMITED)
  emailQuota: number;

  @ApiProperty({ description: 'Storage in MB; -1 = unlimited' })
  @IsInt()
  @Min(UNLIMITED)
  storageQuota: number;

  @ApiProperty({ enum: TenantFeature, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(TenantFeature, { each: true })
  defaultFeatures?: TenantFeature[];
}

export class UpdatePlanDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(UNLIMITED)
  maxUsers?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(UNLIMITED)
  maxCampaigns?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(UNLIMITED)
  maxTemplates?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(UNLIMITED)
  maxLandingPages?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(UNLIMITED)
  maxSendingProfiles?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(UNLIMITED)
  emailQuota?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(UNLIMITED)
  storageQuota?: number;

  @ApiProperty({ enum: TenantFeature, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(TenantFeature, { each: true })
  defaultFeatures?: TenantFeature[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
