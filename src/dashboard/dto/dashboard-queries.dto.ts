import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum BeneficiaryGrowthPeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export class TopListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class BeneficiaryGrowthQueryDto {
  @IsOptional()
  @IsEnum(BeneficiaryGrowthPeriod)
  period?: BeneficiaryGrowthPeriod = BeneficiaryGrowthPeriod.MONTHLY;
}

export class RecentDisbursementsQueryDto extends TopListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  override limit?: number = 20;
}
