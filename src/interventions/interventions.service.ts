import {
  BadRequestException,
  Body,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { In, IsNull, Repository } from 'typeorm';
import { InterventionEntity } from '@/interventions/entities/intervention.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { LgaEntity } from '@/lgas/entities/lga.entity';
import { UUID_REGEX } from '@/common/constants';
import { PaginatedResponse } from '@/common/interfaces/paginated-response.interface';

@Injectable()
export class InterventionsService {
  constructor(
    @InjectRepository(InterventionEntity)
    private interventionRepository: Repository<InterventionEntity>,
    @InjectRepository(LgaEntity)
    private lgaRepository: Repository<LgaEntity>,
  ) {}

  async create(@Body() createInterventionDto: CreateInterventionDto) {
    const { lga_ids, ...interventionData } = createInterventionDto;

    const lgas = await this.lgaRepository.findBy({ id: In(lga_ids) });

    if (lgas.length !== lga_ids.length) {
      const foundIds = lgas.map((lga) => lga.id);
      const missingIds = lga_ids.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `LGAs with IDs ${missingIds.join(', ')} not found`,
      );
    }

    const year = new Date(interventionData.start_date)
      .getFullYear()
      .toString()
      .slice(-2);

    return await this.interventionRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const existingCount = await transactionalEntityManager
          .createQueryBuilder(InterventionEntity, 'intervention')
          .where('intervention.program_code LIKE :pattern', {
            pattern: `KAD-INT-${year}-%`,
          })
          .getCount();

        const sequenceNumber = (existingCount + 1).toString().padStart(3, '0');
        const program_code = `KAD-INT-${year}-${sequenceNumber}`;

        const intervention = this.interventionRepository.create({
          ...interventionData,
          lgas,
          program_code,
        });

        return await transactionalEntityManager.save(intervention);
      },
    );
  }

  async findAll(
    limit = 10,
    page = 1,
  ): Promise<PaginatedResponse<InterventionEntity>> {
    const [data, total] = await this.interventionRepository.findAndCount({
      relations: ['lgas'],
      take: limit,
      skip: (page - 1) * limit,
      order: {
        created_at: 'DESC',
      },
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid intervention ID');
    }

    const intervention = await this.interventionRepository.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['lgas'],
    });

    if (!intervention) {
      throw new NotFoundException(`Intervention with ID ${id} not found`);
    }

    return intervention;
  }

  async update(id: string, updateInterventionDto: UpdateInterventionDto) {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid intervention ID');
    }

    const intervention = await this.interventionRepository.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['lgas'],
    });

    if (!intervention) {
      throw new NotFoundException(`Intervention with ID ${id} not found`);
    }

    const { lga_ids, ...interventionData } = updateInterventionDto;

    if (lga_ids) {
      const lgas = await this.lgaRepository.findBy({ id: In(lga_ids) });

      if (lgas.length !== lga_ids.length) {
        const foundIds = lgas.map((lga) => lga.id);
        const missingIds = lga_ids.filter((id) => !foundIds.includes(id));
        throw new BadRequestException(
          `LGAs with IDs ${missingIds.join(', ')} not found`,
        );
      }

      intervention.lgas = lgas;
    }

    Object.assign(intervention, interventionData);

    const updatedIntervention =
      await this.interventionRepository.save(intervention);
    return updatedIntervention;
  }

  async remove(id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid intervention ID');
    }

    const intervention = await this.interventionRepository.findOne({
      where: { id, deleted_at: IsNull() },
    });

    if (!intervention) {
      throw new NotFoundException(`Intervention with ID ${id} not found`);
    }

    await this.interventionRepository.softDelete(intervention.id);
    return intervention;
  }
}
