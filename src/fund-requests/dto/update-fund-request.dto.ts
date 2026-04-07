import { PartialType } from '@nestjs/mapped-types';
import { CreateFundRequestDto } from './create-fund-request.dto';

export class UpdateFundRequestDto extends PartialType(CreateFundRequestDto) {}
