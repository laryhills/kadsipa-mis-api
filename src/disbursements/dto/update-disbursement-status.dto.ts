import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DisbursementStatus } from '../entities/disbursement.entity';

export class UpdateDisbursementStatusDto {
  @IsEnum(DisbursementStatus)
  @IsNotEmpty()
  status: DisbursementStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
