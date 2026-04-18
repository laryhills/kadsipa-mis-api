import {
  BadRequestException,
  Body,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { In, IsNull, Repository } from 'typeorm';
import { InterventionEntity } from './entities/intervention.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { LgaEntity } from '../lgas/entities/lga.entity';
import { UUID_REGEX } from '../common/constants';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import {
  InterventionListSortBy,
  QueryInterventionsDto,
} from './dto/query-interventions.dto';
import { FindOptionsOrder } from 'typeorm';
import { EnrollmentEntity } from '../enrollments/entities/enrollment.entity';

@Injectable()
export class InterventionsService {
  constructor(
    @InjectRepository(InterventionEntity)
    private interventionRepository: Repository<InterventionEntity>,
    @InjectRepository(LgaEntity)
    private lgaRepository: Repository<LgaEntity>,
  ) {}

  async create(@Body() createInterventionDto: CreateInterventionDto) {
    const {
      lga_ids,
      funding_source,
      intervention_type,
      report_frequency,
      budget_allocated,
      ...interventionData
    } = createInterventionDto;

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
          budgetAllocated: budget_allocated,
          fundingSource: funding_source,
          interventionType: intervention_type,
          reportFrequency: report_frequency,
          lgas,
          program_code,
        });

        return await transactionalEntityManager.save(intervention);
      },
    );
  }

  async findAll(query: QueryInterventionsDto): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortOrder = query.sortOrder ?? 'DESC';

    let results: InterventionEntity[];
    let total: number;

    if (query.sortBy === InterventionListSortBy.enrollmentCount) {
      const qb = this.interventionRepository
        .createQueryBuilder('intervention')
        .leftJoinAndSelect('intervention.lgas', 'lga')
        .where('intervention.deleted_at IS NULL')
        .orderBy(
          '(SELECT COUNT(*) FROM intervention_enrollments e WHERE e.intervention_id = intervention.id)',
          sortOrder,
        )
        .skip((page - 1) * limit)
        .take(limit);
      [results, total] = await qb.getManyAndCount();
    } else {
      const order: FindOptionsOrder<InterventionEntity> = query.sortBy
        ? ({
            [query.sortBy]: sortOrder,
          } as FindOptionsOrder<InterventionEntity>)
        : { created_at: 'DESC' };

      [results, total] = await this.interventionRepository.findAndCount({
        relations: ['lgas'],
        take: limit,
        skip: (page - 1) * limit,
        order,
      });
    }

    const ids = results.map((i) => i.id);
    const enrollmentCountById = new Map<string, number>();
    if (ids.length > 0) {
      const countRows = await this.interventionRepository.manager
        .createQueryBuilder(EnrollmentEntity, 'e')
        .select('e.intervention_id', 'interventionId')
        .addSelect('COUNT(e.id)::int', 'cnt')
        .where('e.intervention_id IN (:...ids)', { ids })
        .groupBy('e.intervention_id')
        .getRawMany<{ interventionId: string; cnt: string }>();

      for (const row of countRows) {
        enrollmentCountById.set(row.interventionId, Number(row.cnt));
      }
    }

    const data = results.map((intervention) => ({
      ...intervention,
      lgas: intervention.lgas.map((lga) => lga.name),
      enrollmentCount: enrollmentCountById.get(intervention.id) ?? 0,
    }));

    /*     const queryBuilder = this.interventionRepository
      .createQueryBuilder('intervention')
      .leftJoin('intervention.lgas', 'lgas')
      .addSelect(['lgas.id', 'lgas.name'])
      .take(limit)
      .skip((page - 1) * limit)
      .orderBy('intervention.created_at', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount(); */

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

    const {
      lga_ids,
      funding_source,
      intervention_type,
      report_frequency,
      ...interventionData
    } = updateInterventionDto;

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

    // Map snake_case to camelCase
    if (funding_source !== undefined) {
      intervention.fundingSource = funding_source;
    }
    if (intervention_type !== undefined) {
      intervention.interventionType = intervention_type;
    }
    if (report_frequency !== undefined) {
      intervention.reportFrequency = report_frequency;
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

  async updateFormSchema(
    id: string,
    formSchema: Record<string, unknown>,
  ): Promise<InterventionEntity> {
    const intervention = await this.findOne(id);
    intervention.formSchema = formSchema;
    return await this.interventionRepository.save(intervention);
  }

  async getFormSchema(id: string): Promise<Record<string, unknown>> {
    const intervention = await this.findOne(id);
    return intervention.formSchema || {};
  }
}
