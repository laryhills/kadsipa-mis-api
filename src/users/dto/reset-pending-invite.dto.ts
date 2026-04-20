import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class ResetPendingInviteDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  personalMessage?: string;
}
