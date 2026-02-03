import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.trim())
  // email domain must be @kdsg.gov.ng
  @Matches(/@kdsg\.gov\.ng$/, { message: 'Email domain must be @kdsg.gov.ng' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  password: string;

  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  full_name: string;
}
