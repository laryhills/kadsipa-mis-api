import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WardEntity } from './entities/ward.entity';
import { LgaEntity } from '@/lgas/entities/lga.entity';

@Injectable()
export class WardsService {
  constructor(
    @InjectRepository(WardEntity)
    private readonly wardRepository: Repository<WardEntity>,
    @InjectRepository(LgaEntity)
    private readonly lgaRepository: Repository<LgaEntity>,
  ) {}

  async findByLga(lgaId: number): Promise<WardEntity[]> {
    const lga = await this.lgaRepository.findOne({
      where: { id: lgaId },
    });

    if (!lga) {
      throw new NotFoundException('LGA not found');
    }

    return await this.wardRepository.find({
      where: { lga_id: lgaId },
      order: { name: 'ASC' },
    });
  }
}
