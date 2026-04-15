import { IsString, IsNotEmpty } from 'class-validator';

export class RejectPendingDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
