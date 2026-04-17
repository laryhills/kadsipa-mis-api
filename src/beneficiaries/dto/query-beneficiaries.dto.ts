import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SortOrderQueryDto } from '../../common/dto/sort-query.dto';

export enum BeneficiaryListSortBy {
  name = 'name',
  nin = 'nin',
  accountNumber = 'accountNumber',
  totalAmountReceived = 'totalAmountReceived',
  lga = 'lga',
  ward = 'ward',
}

export class QueryBeneficiariesDto extends SortOrderQueryDto {
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
  @IsEnum(BeneficiaryListSortBy)
  sortBy?: BeneficiaryListSortBy;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeDeleted?: boolean;
}
