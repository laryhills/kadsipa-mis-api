import { IsString } from 'class-validator';

export class RejectFundRequestDto {
  @IsString()
  notes: string;
}
