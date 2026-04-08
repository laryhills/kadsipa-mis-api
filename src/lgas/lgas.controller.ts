import { Controller, Get, UseGuards } from '@nestjs/common';
import { LgasService } from './lgas.service';
import { PassportJwtGuard } from '@/auth/guards/passport-jwt.guard';
import { successResponse } from '@/common';

@Controller({ version: '1', path: 'lgas' })
@UseGuards(PassportJwtGuard)
export class LgasController {
  constructor(private readonly lgasService: LgasService) {}

  @Get()
  async findAll() {
    const lgas = await this.lgasService.findAll();
    return successResponse('LGAs fetched successfully', lgas);
  }
}
