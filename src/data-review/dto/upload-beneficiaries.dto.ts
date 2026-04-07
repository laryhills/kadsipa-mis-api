import { IsUUID, IsNotEmpty } from 'class-validator';

export class UploadBeneficiariesDto {
  @IsUUID()
  @IsNotEmpty()
  interventionId: string;
}
