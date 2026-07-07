import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsTimeZone,
  IsUrl,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { TenantStatus } from '../enums/tenant-status.enum';

// Lowercase letters, digits and single hyphens; no leading/trailing/double hyphen.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    required: false,
    example: 'acme-corp',
    description: 'URL-safe unique id. Auto-derived from name when omitted.',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(SLUG_PATTERN, {
    message: 'slug must be lowercase alphanumeric with single hyphens as separators',
  })
  slug?: string;

  @ApiProperty({ example: 'admin@acme.example' })
  @IsEmail()
  @MaxLength(254)
  contactEmail: string;

  @ApiProperty({ required: false, example: 'America/New_York', default: 'UTC' })
  @IsOptional()
  @IsTimeZone()
  timezone?: string;

  @ApiProperty({ required: false, example: 'https://cdn.acme.example/logo.png' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  logoUrl?: string;
}

export class UpdateTenantDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(SLUG_PATTERN, {
    message: 'slug must be lowercase alphanumeric with single hyphens as separators',
  })
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  contactEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsTimeZone()
  timezone?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  logoUrl?: string;
}

export class UpdateTenantStatusDto {
  @ApiProperty({ enum: TenantStatus, example: TenantStatus.ACTIVE })
  @IsEnum(TenantStatus)
  status: TenantStatus;
}
