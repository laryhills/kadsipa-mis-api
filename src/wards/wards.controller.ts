import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { WardsService } from './wards.service';
import { PassportJwtGuard } from '@/auth/guards/passport-jwt.guard';
import { successResponse } from '@/common';

@Controller({ version: '1', path: 'lgas/:lga_id/wards' })
@UseGuards(PassportJwtGuard)
export class WardsController {
  constructor(private readonly wardsService: WardsService) {}

  @Get()
  async findByLga(@Param('lga_id', ParseIntPipe) lgaId: number) {
    const wards = await this.wardsService.findByLga(lgaId);
    return successResponse('Wards fetched successfully', wards);
  }
}
