import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateDisbursementDto {
  @IsUUID()
  @IsNotEmpty()
  interventionId: string;

  @IsUUID()
  @IsNotEmpty()
  beneficiaryId: string;

  @IsUUID()
  @IsNotEmpty()
  budgetLineId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
