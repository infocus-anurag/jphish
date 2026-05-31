import { IsString, IsNumber, IsBoolean, IsEmail, MinLength, MaxLength, Min, Max, IsOptional } from 'class-validator';

export class CreateSmtpProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  host: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @IsBoolean()
  secure: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  user: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsEmail()
  @MaxLength(254)
  fromEmail: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  fromName?: string;
}

export class UpdateSmtpProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  host?: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  port?: number;

  @IsBoolean()
  @IsOptional()
  secure?: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  user?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  password?: string;

  @IsEmail()
  @MaxLength(254)
  @IsOptional()
  fromEmail?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  fromName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class TestSmtpProfileDto {
  @IsEmail()
  testEmail: string;
}
