import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  @IsNotEmpty()
  intervention_id: string;

  @IsUUID()
  @IsNotEmpty()
  beneficiary_id: string;

  @IsDateString()
  @IsNotEmpty()
  enrollment_date: Date;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  reason_code?: string;

  @IsString()
  @IsOptional()
  reason_text?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  allocation_amount?: number;
}
