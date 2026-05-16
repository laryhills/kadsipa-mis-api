import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  // Matches,
  IsArray,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class InviteUserDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.trim())
  // @Matches(/@(kdsg|kadsipa)\.gov\.ng$/, {
  //   message: 'Email domain must be @kdsg.gov.ng or @kadsipa.gov.ng',
  // })
  email: string;

  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  full_name: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  personalMessage?: string;
}
