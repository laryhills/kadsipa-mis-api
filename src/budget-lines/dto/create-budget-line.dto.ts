import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { BudgetType, BudgetLineCategory } from '../entities/budget-line.entity';

export class CreateBudgetLineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsEnum(BudgetType)
  @IsNotEmpty()
  budgetType: BudgetType;

  @IsEnum(BudgetLineCategory)
  @IsNotEmpty()
  category: BudgetLineCategory;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  accountCode?: string;

  @IsUUID()
  @IsNotEmpty()
  fiscalYearId: string;

  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsNumber()
  @Min(0)
  allocatedAmount: number;

  @IsString()
  @IsOptional()
  justification?: string;
}
