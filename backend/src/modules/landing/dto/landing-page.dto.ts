import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUrl,
  MaxLength,
  Matches,
} from 'class-validator';
import { LandingPageCapture } from '../entities/landing-page.entity';

export class CreateLandingPageDto {
  @ApiProperty({ example: 'Workday password reset' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'workday-reset', description: 'URL-safe slug, lowercase, hyphens only' })
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
    message: 'slug must be lowercase letters, digits and hyphens',
  })
  slug: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  htmlContent: string;

  @ApiProperty({ enum: LandingPageCapture, default: LandingPageCapture.CREDENTIALS })
  @IsEnum(LandingPageCapture)
  captureType: LandingPageCapture;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUrl?: string;
}

export class CloneLandingPageDto {
  @ApiProperty({ example: 'https://login.example.com', description: 'Public URL to clone' })
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  url: string;
}

export class UpdateLandingPageDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  htmlContent?: string;

  @ApiProperty({ required: false, enum: LandingPageCapture })
  @IsOptional()
  @IsEnum(LandingPageCapture)
  captureType?: LandingPageCapture;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
