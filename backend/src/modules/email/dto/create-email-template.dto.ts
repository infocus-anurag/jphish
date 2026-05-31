import { IsString, IsEnum, IsArray, MinLength, MaxLength, IsOptional, ValidateIf } from 'class-validator';
import { EmailTemplateType } from '../enums/email-template-type.enum';

export class CreateEmailTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  subject: string;

  @IsString()
  @MinLength(1)
  htmlContent: string;

  @IsString()
  @IsOptional()
  textContent?: string;

  @IsEnum(EmailTemplateType)
  type: EmailTemplateType;

  @IsArray()
  @IsString({ each: true })
  variables: string[];
}

export class UpdateEmailTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  subject?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  htmlContent?: string;

  @IsString()
  @IsOptional()
  textContent?: string;

  @IsEnum(EmailTemplateType)
  @IsOptional()
  type?: EmailTemplateType;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variables?: string[];

  @IsOptional()
  isActive?: boolean;
}

export class PreviewEmailTemplateDto {
  @IsArray()
  @IsOptional()
  variables?: Record<string, string>;
}
