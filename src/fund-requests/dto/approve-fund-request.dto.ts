import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ApproveFundRequestDto {
  @IsNumber()
  @Min(0)
  approvedAmount: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
