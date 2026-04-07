import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BatchDisbursementItemDto {
  @IsUUID()
  @IsNotEmpty()
  beneficiaryId: string;

  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateBatchDisbursementDto {
  @IsUUID()
  @IsNotEmpty()
  interventionId: string;

  @IsUUID()
  @IsNotEmpty()
  budgetLineId: string;

  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchDisbursementItemDto)
  disbursements: BatchDisbursementItemDto[];
}
