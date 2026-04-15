import {
  IsString,
  IsNumber,
  IsUUID,
  IsOptional,
  IsArray,
  Min,
} from 'class-validator';

export class CreateFundRequestDto {
  @IsString()
  title: string;

  @IsUUID()
  budgetLineId: string;

  @IsUUID()
  @IsOptional()
  interventionId?: string;

  @IsNumber()
  @Min(0)
  requestedAmount: number;

  @IsString()
  justification: string;

  @IsArray()
  @IsOptional()
  supportingDocuments?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}
