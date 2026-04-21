import { IsNotEmpty, IsString } from 'class-validator';

export class RevokeOthersSessionsDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
