import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';
import { BeneficiaryEntity } from './entities/beneficiary.entity';
import { UUID_REGEX } from '@/common/constants';
import { PaginatedResponse } from '@/common/interfaces/paginated-response.interface';

@Injectable()
export class BeneficiariesService {
  constructor(
    @InjectRepository(BeneficiaryEntity)
    private readonly beneficiaryRepository: Repository<BeneficiaryEntity>,
  ) {}

  async create(
    createBeneficiaryDtos: CreateBeneficiaryDto[],
    userId?: string,
  ): Promise<BeneficiaryEntity[]> {
    const nidhhValues = createBeneficiaryDtos.map((dto) => dto.nidhh);
    const uniqueNidhhValues = [...new Set(nidhhValues)];

    if (nidhhValues.length !== uniqueNidhhValues.length) {
      throw new BadRequestException('Duplicate nidhh values in request');
    }

    const existingBeneficiaries = await this.beneficiaryRepository.find({
      where: nidhhValues.map((nidhh) => ({ nidhh })),
    });

    if (existingBeneficiaries.length > 0) {
      const existingNidhhValues = existingBeneficiaries.map((b) => b.nidhh);
      throw new ConflictException(
        `Beneficiaries with nidhh already exist: ${existingNidhhValues.join(', ')}`,
      );
    }

    const beneficiaries = createBeneficiaryDtos.map((dto) =>
      this.beneficiaryRepository.create({
        ...dto,
        created_by: userId,
      }),
    );

    return await this.beneficiaryRepository.save(beneficiaries);
  }

  async findAll(
    includeDeleted = false,
    limit = 10,
    page = 1,
  ): Promise<PaginatedResponse<BeneficiaryEntity>> {
    const whereClause = includeDeleted ? undefined : { deleted_at: IsNull() };

    const [data, total] = await this.beneficiaryRepository.findAndCount({
      where: whereClause,
      relations: ['enrollments'],
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

  async findOne(id: string): Promise<BeneficiaryEntity> {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid beneficiary ID');
    }

    const beneficiary = await this.beneficiaryRepository.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['enrollments', 'enrollments.intervention'],
    });

    if (!beneficiary) {
      throw new NotFoundException('Beneficiary not found');
    }

    return beneficiary;
  }

  async update(
    id: string,
    updateBeneficiaryDto: UpdateBeneficiaryDto,
  ): Promise<BeneficiaryEntity> {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid beneficiary ID');
    }

    const beneficiary = await this.findOne(id);

    if (
      updateBeneficiaryDto.nidhh &&
      updateBeneficiaryDto.nidhh !== beneficiary.nidhh
    ) {
      const existing = await this.beneficiaryRepository.findOne({
        where: { nidhh: updateBeneficiaryDto.nidhh },
      });

      if (existing) {
        throw new ConflictException(
          'Beneficiary with this nidhh already exists',
        );
      }
    }

    await this.beneficiaryRepository.update(id, updateBeneficiaryDto);

    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid beneficiary ID');
    }

    await this.beneficiaryRepository.update(id, {
      deleted_at: new Date(),
    });
  }

  async restore(id: string): Promise<BeneficiaryEntity> {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid beneficiary ID');
    }

    const beneficiary = await this.beneficiaryRepository.findOne({
      where: { id },
    });

    if (!beneficiary) {
      throw new NotFoundException('Beneficiary not found');
    }

    await this.beneficiaryRepository.update(id, {
      deleted_at: () => 'NULL',
    });

    return await this.findOne(id);
  }
}
