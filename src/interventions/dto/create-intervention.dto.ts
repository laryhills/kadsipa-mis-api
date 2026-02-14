import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';

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

  @IsString()
  @IsNotEmpty({ message: 'Funding source is required' })
  @Transform(({ value }: { value: string }) => value.trim())
  // must be in [lg, sa]
  @IsIn(['Local Government', 'World Bank', 'DFID', 'FAO'], {
    message:
      'Funding source must be either Local Government, World Bank, DFID, or FAO',
  })
  funding_source: string;

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
