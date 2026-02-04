import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ActivityType } from '../constants/audit-action.enum';

export class QueryActivityLogDto {
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @IsEnum(ActivityType)
  activity_type?: ActivityType;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 50;
}
