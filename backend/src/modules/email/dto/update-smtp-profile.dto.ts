import { PartialType } from '@nestjs/mapped-types';
import { CreateSmtpProfileDto } from './create-smtp-profile.dto';

export class UpdateSmtpProfileDto extends PartialType(CreateSmtpProfileDto) {}
