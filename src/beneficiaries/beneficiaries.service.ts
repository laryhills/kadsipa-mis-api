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

@Injectable()
export class BeneficiariesService {
  constructor(
    @InjectRepository(BeneficiaryEntity)
    private readonly beneficiaryRepository: Repository<BeneficiaryEntity>,
  ) {}

  async create(
    createBeneficiaryDto: CreateBeneficiaryDto,
    userId?: string,
  ): Promise<BeneficiaryEntity> {
    const existing = await this.beneficiaryRepository.findOne({
      where: { beneficiary_code: createBeneficiaryDto.beneficiary_code },
    });

    if (existing) {
      throw new ConflictException('Beneficiary code already exists');
    }

    const beneficiary = this.beneficiaryRepository.create({
      ...createBeneficiaryDto,
      created_by: userId,
    });

    return await this.beneficiaryRepository.save(beneficiary);
  }

  async findAll(includeDeleted = false): Promise<BeneficiaryEntity[]> {
    const whereClause = includeDeleted ? {} : { deleted_at: IsNull() };
    return await this.beneficiaryRepository.find({
      where: whereClause,
      relations: ['enrollments'],
    });
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
      updateBeneficiaryDto.beneficiary_code &&
      updateBeneficiaryDto.beneficiary_code !== beneficiary.beneficiary_code
    ) {
      const existing = await this.beneficiaryRepository.findOne({
        where: { beneficiary_code: updateBeneficiaryDto.beneficiary_code },
      });

      if (existing) {
        throw new ConflictException('Beneficiary code already exists');
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
