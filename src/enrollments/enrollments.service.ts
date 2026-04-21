import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { EnrollmentEntity } from './entities/enrollment.entity';
import { UUID_REGEX } from '../common/constants';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(EnrollmentEntity)
    private readonly enrollmentRepository: Repository<EnrollmentEntity>,
  ) {}

  async create(
    createEnrollmentDto: CreateEnrollmentDto,
    userId?: string,
  ): Promise<EnrollmentEntity> {
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: {
        intervention_id: createEnrollmentDto.intervention_id,
        beneficiary_id: createEnrollmentDto.beneficiary_id,
      },
    });

    if (existingEnrollment) {
      throw new ConflictException(
        'Beneficiary is already enrolled in this intervention',
      );
    }

    const enrollment = this.enrollmentRepository.create({
      ...createEnrollmentDto,
      created_by: userId,
    });

    return await this.enrollmentRepository.save(enrollment);
  }

  async findAll(
    limit = 10,
    page = 1,
  ): Promise<PaginatedResponse<EnrollmentEntity>> {
    const [data, total] = await this.enrollmentRepository.findAndCount({
      relations: ['intervention', 'beneficiary'],
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

  async findByIntervention(
    interventionId: string,
  ): Promise<EnrollmentEntity[]> {
    if (!UUID_REGEX.test(interventionId)) {
      throw new BadRequestException('Invalid intervention ID');
    }

    return await this.enrollmentRepository.find({
      where: { intervention_id: interventionId },
      relations: ['beneficiary'],
    });
  }

  async findByBeneficiary(beneficiaryId: string): Promise<EnrollmentEntity[]> {
    if (!UUID_REGEX.test(beneficiaryId)) {
      throw new BadRequestException('Invalid beneficiary ID');
    }

    return await this.enrollmentRepository.find({
      where: { beneficiary_id: beneficiaryId },
      relations: ['intervention'],
    });
  }

  async findOne(
    beneficiaryIdOrEnrollmentId: string,
    interventionId?: string,
  ): Promise<EnrollmentEntity | null> {
    if (interventionId) {
      if (
        !UUID_REGEX.test(beneficiaryIdOrEnrollmentId) ||
        !UUID_REGEX.test(interventionId)
      ) {
        throw new BadRequestException('Invalid beneficiary or intervention ID');
      }

      const enrollment = await this.enrollmentRepository.findOne({
        where: {
          beneficiary_id: beneficiaryIdOrEnrollmentId,
          intervention_id: interventionId,
        },
        relations: ['intervention', 'beneficiary'],
      });

      return enrollment;
    }

    if (!UUID_REGEX.test(beneficiaryIdOrEnrollmentId)) {
      throw new BadRequestException('Invalid enrollment ID');
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: beneficiaryIdOrEnrollmentId },
      relations: ['intervention', 'beneficiary'],
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return enrollment;
  }

  async update(
    id: string,
    updateEnrollmentDto: UpdateEnrollmentDto,
  ): Promise<EnrollmentEntity> {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid enrollment ID');
    }

    const currentEnrollment = await this.findOne(id);
    if (!currentEnrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (
      updateEnrollmentDto.intervention_id ||
      updateEnrollmentDto.beneficiary_id
    ) {
      const existingEnrollment = await this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .where('enrollment.id != :id', { id })
        .andWhere('enrollment.intervention_id = :interventionId', {
          interventionId:
            updateEnrollmentDto.intervention_id ||
            currentEnrollment.intervention_id,
        })
        .andWhere('enrollment.beneficiary_id = :beneficiaryId', {
          beneficiaryId:
            updateEnrollmentDto.beneficiary_id ||
            currentEnrollment.beneficiary_id,
        })
        .getOne();

      if (existingEnrollment) {
        throw new ConflictException(
          'Beneficiary is already enrolled in this intervention',
        );
      }
    }

    const { customData, ...updateData } = updateEnrollmentDto;
    await this.enrollmentRepository.update(id, updateData);

    if (customData !== undefined) {
      currentEnrollment.customData = customData;
      await this.enrollmentRepository.save(currentEnrollment);
    }

    const updated = await this.findOne(id);
    if (!updated) {
      throw new NotFoundException('Enrollment not found after update');
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid enrollment ID');
    }

    const enrollment = await this.findOne(id);
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    await this.enrollmentRepository.remove(enrollment);
  }

  async removeByInterventionAndBeneficiary(
    interventionId: string,
    beneficiaryId: string,
  ): Promise<void> {
    if (!UUID_REGEX.test(interventionId) || !UUID_REGEX.test(beneficiaryId)) {
      throw new BadRequestException('Invalid intervention or beneficiary ID');
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { intervention_id: interventionId, beneficiary_id: beneficiaryId },
    });

    if (!enrollment) {
      throw new NotFoundException(
        'Beneficiary is not enrolled in this intervention',
      );
    }

    await this.enrollmentRepository.remove(enrollment);
  }
}
