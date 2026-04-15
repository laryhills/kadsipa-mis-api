import { IsString, IsDateString, IsBoolean, IsOptional } from 'class-validator';

export class CreateFiscalYearDto {
  @IsString()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
