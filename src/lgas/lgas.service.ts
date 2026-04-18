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

  /**
   * Maps trimmed lowercased LGA names to lgas.id (first row by id if names collide across states).
   */
  async findIdsByNormalizedNames(
    names: string[],
  ): Promise<Map<string, number>> {
    const normalized = [
      ...new Set(
        names
          .map((n) => (typeof n === 'string' ? n.trim().toLowerCase() : ''))
          .filter((n) => n.length > 0),
      ),
    ];
    if (normalized.length === 0) {
      return new Map();
    }

    const rows = await this.lgaRepository
      .createQueryBuilder('lga')
      .select(['lga.id', 'lga.name'])
      .where('LOWER(TRIM(lga.name)) IN (:...names)', { names: normalized })
      .orderBy('lga.id', 'ASC')
      .getMany();

    const map = new Map<string, number>();
    for (const row of rows) {
      const key = row.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, row.id);
      }
    }
    return map;
  }
}
