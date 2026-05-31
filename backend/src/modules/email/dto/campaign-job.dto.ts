import { IsUUID, IsString, IsOptional, IsObject } from 'class-validator';

export class SendCampaignJobDto {
  @IsUUID()
  campaignId: string;

  @IsUUID()
  smtpProfileId: string;
}

export class TrackPixelDto {
  @IsUUID()
  trackingId: string;
}

export class TrackClickDto {
  @IsUUID()
  trackingId: string;

  @IsString()
  @IsOptional()
  url?: string;
}

export class TrackFormSubmissionDto {
  @IsUUID()
  trackingId: string;

  @IsObject()
  @IsOptional()
  formData?: Record<string, any>;
}
