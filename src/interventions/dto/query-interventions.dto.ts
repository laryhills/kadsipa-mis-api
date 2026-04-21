import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SortOrderQueryDto } from '../../common/dto/sort-query.dto';

export enum InterventionListSortBy {
  name = 'name',
  fundingSource = 'fundingSource',
  budgetAllocated = 'budgetAllocated',
  budgetSpent = 'budgetSpent',
  status = 'status',
  enrollmentCount = 'enrollmentCount',
}

export class QueryInterventionsDto extends SortOrderQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(InterventionListSortBy)
  sortBy?: InterventionListSortBy;
}
