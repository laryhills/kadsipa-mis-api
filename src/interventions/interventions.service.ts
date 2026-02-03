import { Body, Injectable } from '@nestjs/common';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { Repository } from 'typeorm';
import { InterventionEntity } from '@/interventions/entities/intervention.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class InterventionsService {
  constructor(
    @InjectRepository(InterventionEntity)
    private interventionRepository: Repository<InterventionEntity>,
  ) {}

  create(@Body() createInterventionDto: CreateInterventionDto) {
    return 'This action adds a new intervention';
  }

  async findAll() {
    return await this.interventionRepository.find();
  }

  findOne(id: number) {
    return `This action returns a #${id} intervention`;
  }

  update(id: number, updateInterventionDto: UpdateInterventionDto) {
    return `This action updates a #${id} intervention`;
  }

  remove(id: number) {
    return `This action removes a #${id} intervention`;
  }
}
