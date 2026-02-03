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
import { UUID_REGEX } from '@/common/constants';

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

  async findAll(): Promise<EnrollmentEntity[]> {
    return await this.enrollmentRepository.find({
      relations: ['intervention', 'beneficiary'],
    });
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

  async findOne(id: string): Promise<EnrollmentEntity> {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid enrollment ID');
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
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

    await this.findOne(id);

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
            (await this.findOne(id)).intervention_id,
        })
        .andWhere('enrollment.beneficiary_id = :beneficiaryId', {
          beneficiaryId:
            updateEnrollmentDto.beneficiary_id ||
            (await this.findOne(id)).beneficiary_id,
        })
        .getOne();

      if (existingEnrollment) {
        throw new ConflictException(
          'Beneficiary is already enrolled in this intervention',
        );
      }
    }

    await this.enrollmentRepository.update(id, updateEnrollmentDto);

    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid enrollment ID');
    }

    const enrollment = await this.findOne(id);

    await this.enrollmentRepository.remove(enrollment);
  }
}
