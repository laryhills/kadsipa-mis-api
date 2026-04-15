import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsObject,
  IsNotEmpty,
  IsUUID,
  MaxLength,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ReportType } from '../enums/report-type.enum';
import { FileFormat } from '../enums/file-format.enum';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsUUID()
  @IsOptional()
  interventionId?: string;

  @IsEnum(ReportType)
  @IsNotEmpty()
  reportType: ReportType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(FileFormat)
  @IsNotEmpty()
  fileFormat: FileFormat;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  includedMetrics?: string[];

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  shouldFinalize?: boolean;

  @IsObject()
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string'
      ? (JSON.parse(value) as Record<string, unknown>)
      : value,
  )
  config?: Record<string, unknown>;
}
