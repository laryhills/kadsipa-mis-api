import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  FundingSource,
  InterventionType,
  ReportFrequency,
} from '../entities/intervention.entity';

export class CreateInterventionDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  name: string;

  @IsNotEmpty({ message: 'Budget allocated is required' })
  @IsNumber({}, { message: 'Budget allocated must be a valid number' })
  @IsPositive({ message: 'Budget allocated must be a positive number' })
  @Transform(({ value }) => Number(value))
  budget_allocated: number;

  @IsEnum(FundingSource, {
    message: `Funding source must be one of: ${Object.values(FundingSource).join(', ')}`,
  })
  @IsNotEmpty({ message: 'Funding source is required' })
  funding_source: FundingSource;

  @IsEnum(InterventionType, {
    message: `Intervention type must be one of: ${Object.values(InterventionType).join(', ')}`,
  })
  @IsOptional()
  intervention_type?: InterventionType;

  @IsEnum(ReportFrequency, {
    message: `Report frequency must be one of: ${Object.values(ReportFrequency).join(', ')}`,
  })
  @IsOptional()
  report_frequency?: ReportFrequency;

  @IsUUID()
  @IsOptional()
  budget_line_id?: string;

  @IsDateString()
  @IsNotEmpty({ message: 'Start date is required' })
  start_date: Date;

  @IsDateString()
  @IsNotEmpty({ message: 'End date is required' })
  end_date: Date;

  @IsString()
  @IsNotEmpty({ message: 'Program type is required' })
  @Transform(({ value }: { value: string }) => value.trim())
  program_type: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @Transform(({ value }: { value: string }) => value.trim())
  description: string;

  /* @IsString()
  @IsNotEmpty({ message: 'Program code is required' })
  @Transform(({ value }: { value: string }) => value.trim())
  program_code: string; */

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one LGA must be assigned' })
  @IsInt({ each: true, message: 'Each LGA ID must be an integer' })
  lga_ids: number[];
}
