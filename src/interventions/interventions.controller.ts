import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { InterventionsService } from './interventions.service';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { PassportJwtGuard } from '@/auth/guards/passport-jwt.guard';
import { createdResponse, successResponse } from '@/common';

@Controller('interventions')
export class InterventionsController {
  constructor(private readonly interventionsService: InterventionsService) {}

  @Post()
  @UseGuards(PassportJwtGuard)
  async create(@Body() createInterventionDto: CreateInterventionDto) {
    const result = await this.interventionsService.create(
      createInterventionDto,
    );
    return createdResponse('Intervention created successfully', result);
  }

  @Get()
  @UseGuards(PassportJwtGuard)
  async findAll() {
    const result = await this.interventionsService.findAll();
    return successResponse('Interventions fetched successfully', result);
  }

  @Get(':id')
  @UseGuards(PassportJwtGuard)
  async findOne(@Param('id') id: string) {
    const result = await this.interventionsService.findOne(id);
    return successResponse('Intervention fetched successfully', result);
  }

  @Patch(':id')
  @UseGuards(PassportJwtGuard)
  async update(
    @Param('id') id: string,
    @Body() updateInterventionDto: UpdateInterventionDto,
  ) {
    const result = await this.interventionsService.update(
      id,
      updateInterventionDto,
    );
    return successResponse('Intervention updated successfully', result);
  }

  @Delete(':id')
  @UseGuards(PassportJwtGuard)
  async remove(@Param('id') id: string) {
    const result = await this.interventionsService.remove(id);
    return successResponse('Intervention deleted successfully', result);
  }
}
