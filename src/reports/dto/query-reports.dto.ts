import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ReportType } from '../enums/report-type.enum';
import { ReportStatus } from '../enums/report-status.enum';
import { SortOrderQueryDto } from '../../common/dto/sort-query.dto';
import { ReportListSortBy } from '../enums/report-list-sort-by.enum';

export { ReportListSortBy } from '../enums/report-list-sort-by.enum';

export class QueryReportsDto extends SortOrderQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  interventionId?: string;

  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  /** Reports whose date range overlaps [periodStart, periodEnd] (inclusive). */
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  limit?: number = 10;

  @IsOptional()
  @IsEnum(ReportListSortBy)
  sortBy?: ReportListSortBy = ReportListSortBy.createdAt;
}
