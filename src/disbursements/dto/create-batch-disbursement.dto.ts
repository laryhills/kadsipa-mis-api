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

  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchDisbursementItemDto)
  disbursements: BatchDisbursementItemDto[];
}
