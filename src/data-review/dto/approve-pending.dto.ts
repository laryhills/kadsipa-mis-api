import { IsString, IsOptional } from 'class-validator';

export class ApprovePendingDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
