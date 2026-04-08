import { PartialType } from '@nestjs/mapped-types';
import { CreateInterventionDto } from './create-intervention.dto';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpdateInterventionDto extends PartialType(CreateInterventionDto) {
  @IsOptional()
  @IsNumber({}, { message: 'Budget allocated must be a valid number' })
  @IsPositive({ message: 'Budget allocated must be a positive number' })
  @Transform(({ value }) => Number(value))
  budget_allocated?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  budgetSpent?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  budget_received?: number;
}
