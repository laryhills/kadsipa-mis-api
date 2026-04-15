import { PartialType } from '@nestjs/mapped-types';
import { CreateBudgetLineDto } from './create-budget-line.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateBudgetLineDto extends PartialType(CreateBudgetLineDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
