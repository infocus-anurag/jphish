import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { UsageMetric } from '../enums/usage-metric.enum';

export class ResetUsageDto {
  @ApiProperty({
    enum: UsageMetric,
    required: false,
    description: 'Metric to reset. Omit to reset every usage counter.',
  })
  @IsOptional()
  @IsEnum(UsageMetric)
  metric?: UsageMetric;
}
