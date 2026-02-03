import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LgaEntity } from './entities/lga.entity';

@Injectable()
export class LgasService {
  constructor(
    @InjectRepository(LgaEntity)
    private readonly lgaRepository: Repository<LgaEntity>,
  ) {}

  async findAll(): Promise<LgaEntity[]> {
    return await this.lgaRepository.find({
      relations: ['state'],
      order: { name: 'ASC' },
    });
  }
}
