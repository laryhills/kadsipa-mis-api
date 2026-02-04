import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { AuditAction, AuditStatus } from '../constants/audit-action.enum';

export class QueryAuditLogDto {
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  resource_type?: string;

  @IsOptional()
  @IsUUID()
  resource_id?: string;

  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

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
