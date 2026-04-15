import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDisbursementDto {
  @IsUUID()
  @IsNotEmpty()
  interventionId: string;

  @IsUUID()
  @IsNotEmpty()
  beneficiaryId: string;

  // @IsNumber()
  // @Min(0.0)
  // amount: number;

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
