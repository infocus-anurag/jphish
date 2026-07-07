import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsObject } from 'class-validator';
import { TenantFeature } from '../enums/tenant-feature.enum';

export class AssignPlanDto {
  @ApiProperty({ description: 'Plan id to subscribe the tenant to' })
  @IsUUID()
  planId: string;
}

export class SetFeatureOverridesDto {
  @ApiProperty({
    description:
      'Per-feature overrides: true force-enables, false force-disables, omit a key to inherit the plan default.',
    example: { ai_features: true, api_access: false },
  })
  @IsObject()
  overrides: Partial<Record<TenantFeature, boolean>>;
}
