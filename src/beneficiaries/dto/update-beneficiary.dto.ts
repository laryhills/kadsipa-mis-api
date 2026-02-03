import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateBeneficiaryDto } from './create-beneficiary.dto';
import { BeneficiaryStatus } from '../entities/beneficiary.entity';

export class UpdateBeneficiaryDto extends PartialType(CreateBeneficiaryDto) {
  @IsEnum(BeneficiaryStatus)
  @IsOptional()
  status?: BeneficiaryStatus;
}
