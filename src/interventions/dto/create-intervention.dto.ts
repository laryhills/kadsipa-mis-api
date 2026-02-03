import { IsDecimal, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateInterventionDto {
  @IsNotEmpty({ message: 'Title is required' })
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  title: string;

  @IsDecimal({ decimal_digits: '2', force_decimal: true })
  @IsNotEmpty({ message: 'Amount is required' })
  @Transform(({ value }) => Number(value))
  amount: number;
}
