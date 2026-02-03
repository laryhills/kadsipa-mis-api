import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateEnrollmentDto } from './create-enrollment.dto';
import { EnrollmentStatus } from '../entities/enrollment.entity';

export class UpdateEnrollmentDto extends PartialType(CreateEnrollmentDto) {
  @IsEnum(EnrollmentStatus)
  @IsOptional()
  status?: EnrollmentStatus;
}
