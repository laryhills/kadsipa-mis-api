import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { BeneficiaryType } from '../entities/beneficiary.entity';
import { Type } from 'class-transformer';

export class CreateBeneficiaryDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,12}$/, {
    message: 'nidhh must be 10-12 digits',
  })
  nidhh: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  legacy_id: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/, {
    message: 'account_number must be exactly 10 digits',
  })
  account_number: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  bank: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  community: string;

  @IsEnum(BeneficiaryType)
  @IsNotEmpty()
  beneficiary_type: BeneficiaryType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  last_name: string;

  @IsDateString()
  @IsOptional()
  date_of_birth?: Date;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  gender?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  nin: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  bvn?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone_number?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  disability_status?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  lga?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  ward?: string;
}

export class CreateBeneficiaryDtoArray {
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateBeneficiaryDto)
  beneficiaries: CreateBeneficiaryDto[];
}
