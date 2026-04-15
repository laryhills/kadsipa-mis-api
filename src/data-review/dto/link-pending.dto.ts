import { IsUUID, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class LinkPendingDto {
  @IsUUID()
  @IsNotEmpty()
  beneficiaryId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
