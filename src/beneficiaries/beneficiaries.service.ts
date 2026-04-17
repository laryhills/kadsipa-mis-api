import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';
import {
  BeneficiaryEntity,
  BeneficiaryType,
} from './entities/beneficiary.entity';
import { UUID_REGEX } from '../common/constants';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import {
  BeneficiaryListSortBy,
  QueryBeneficiariesDto,
} from './dto/query-beneficiaries.dto';
import { DisbursementStatus } from '../disbursements/entities/disbursement.entity';

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
    query: QueryBeneficiariesDto,
  ): Promise<PaginatedResponse<BeneficiaryEntity>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortOrder = query.sortOrder ?? 'DESC';
    const includeDeleted = query.includeDeleted ?? false;

    const qb = this.beneficiaryRepository
      .createQueryBuilder('beneficiary')
      .leftJoinAndSelect('beneficiary.enrollments', 'enrollment');

    if (!includeDeleted) {
      qb.andWhere('beneficiary.deleted_at IS NULL');
    }

    this.applyBeneficiarySort(qb, query.sortBy, sortOrder, {
      allowTotalAmountReceived: true,
    });

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findAllByIntervention(
    interventionId: string,
    query: QueryBeneficiariesDto,
  ): Promise<PaginatedResponse<BeneficiaryEntity>> {
    if (!UUID_REGEX.test(interventionId)) {
      throw new BadRequestException('Invalid intervention ID');
    }

    if (query.sortBy === BeneficiaryListSortBy.totalAmountReceived) {
      throw new BadRequestException(
        'sortBy totalAmountReceived is only supported on GET /beneficiaries',
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortOrder = query.sortOrder ?? 'DESC';
    const includeDeleted = query.includeDeleted ?? false;

    const qb = this.beneficiaryRepository
      .createQueryBuilder('beneficiary')
      .innerJoinAndSelect(
        'beneficiary.enrollments',
        'enrollment',
        'enrollment.intervention_id = :interventionId',
        { interventionId },
      );

    if (!includeDeleted) {
      qb.andWhere('beneficiary.deleted_at IS NULL');
    }

    this.applyBeneficiarySort(qb, query.sortBy, sortOrder, {
      allowTotalAmountReceived: false,
    });

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  private applyBeneficiarySort(
    qb: SelectQueryBuilder<BeneficiaryEntity>,
    sortBy: BeneficiaryListSortBy | undefined,
    sortOrder: 'ASC' | 'DESC',
    opts: { allowTotalAmountReceived: boolean },
  ): void {
    if (
      sortBy === BeneficiaryListSortBy.totalAmountReceived &&
      opts.allowTotalAmountReceived
    ) {
      qb.addSelect(
        `(SELECT COALESCE(SUM(d.amount), 0) FROM disbursements d WHERE d.beneficiary_id = beneficiary.id AND d.status = :paidStatus)`,
        'total_paid_sum',
      );
      qb.setParameter('paidStatus', DisbursementStatus.PAID);
      qb.orderBy('total_paid_sum', sortOrder);
      return;
    }

    if (sortBy === BeneficiaryListSortBy.name) {
      qb.orderBy('beneficiary.last_name', sortOrder).addOrderBy(
        'beneficiary.first_name',
        sortOrder,
      );
      return;
    }

    if (sortBy === BeneficiaryListSortBy.nin) {
      qb.orderBy('beneficiary.nin', sortOrder);
      return;
    }

    if (sortBy === BeneficiaryListSortBy.accountNumber) {
      qb.orderBy('beneficiary.account_number', sortOrder);
      return;
    }

    if (sortBy === BeneficiaryListSortBy.lga) {
      qb.orderBy('beneficiary.lga', sortOrder, 'NULLS LAST');
      return;
    }

    if (sortBy === BeneficiaryListSortBy.ward) {
      qb.orderBy('beneficiary.ward', sortOrder, 'NULLS LAST');
      return;
    }

    qb.orderBy('beneficiary.created_at', 'DESC');
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

  async findByNIN(nin: string): Promise<BeneficiaryEntity | null> {
    const beneficiary = await this.beneficiaryRepository.findOne({
      where: { nidhh: nin, deleted_at: IsNull() },
    });

    return beneficiary;
  }

  async createOne(
    createBeneficiaryDto: CreateBeneficiaryDto | Record<string, string>,
    userId?: string,
  ): Promise<BeneficiaryEntity> {
    const nin =
      'nidhh' in createBeneficiaryDto
        ? createBeneficiaryDto.nidhh
        : 'nin' in createBeneficiaryDto
          ? createBeneficiaryDto.nin
          : undefined;

    if (!nin) {
      throw new BadRequestException('NIN/NIDHH is required');
    }

    const existing = await this.beneficiaryRepository.findOne({
      where: { nidhh: nin },
    });

    if (existing) {
      throw new ConflictException('Beneficiary with this NIN already exists');
    }

    // Provide defaults for required fields not typically in CSV uploads
    const beneficiaryData: Partial<BeneficiaryEntity> = {
      ...createBeneficiaryDto,
      nidhh: nin,
      beneficiary_type:
        'beneficiary_type' in createBeneficiaryDto &&
        createBeneficiaryDto.beneficiary_type
          ? (createBeneficiaryDto.beneficiary_type as BeneficiaryType)
          : BeneficiaryType.INDIVIDUAL,
      community:
        'community' in createBeneficiaryDto && createBeneficiaryDto.community
          ? createBeneficiaryDto.community
          : 'Not Specified',
      created_by: userId,
    };

    const beneficiary = this.beneficiaryRepository.create(beneficiaryData);

    return await this.beneficiaryRepository.save(beneficiary);
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
