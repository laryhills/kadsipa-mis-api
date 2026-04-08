import { IsArray, IsUUID, IsString, IsOptional } from 'class-validator';

export class BulkApproveDto {
  @IsArray()
  @IsUUID('4', { each: true })
  pendingIds: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}
