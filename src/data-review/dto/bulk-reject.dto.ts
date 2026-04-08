import { IsArray, IsUUID, IsString, IsNotEmpty } from 'class-validator';

export class BulkRejectDto {
  @IsArray()
  @IsUUID('4', { each: true })
  pendingIds: string[];

  @IsString()
  @IsNotEmpty()
  reason: string;
}
