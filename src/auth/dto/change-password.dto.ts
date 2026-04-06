import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  currentPassword: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  @Transform(({ value }: { value: string }) => value.trim())
  newPassword: string;
}
