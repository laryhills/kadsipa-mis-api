import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  DisbursementEntity,
  DisbursementStatus,
} from './entities/disbursement.entity';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';
import { CreateBatchDisbursementDto } from './dto/create-batch-disbursement.dto';
import { UpdateDisbursementStatusDto } from './dto/update-disbursement-status.dto';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import { InterventionsService } from '../interventions/interventions.service';
import { EnrollmentsService } from '@/enrollments/enrollments.service';
import {
  FundRequestEntity,
  FundRequestStatus,
} from '../fund-requests/entities/fund-request.entity';
import { BudgetLineEntity } from '../budget-lines/entities/budget-line.entity';
import {
  EnrollmentEntity,
  EnrollmentStatus,
} from '../enrollments/entities/enrollment.entity';
import { InterventionEntity } from '../interventions/entities/intervention.entity';

const BLOCKING_DISBURSEMENT_STATUSES: DisbursementStatus[] = [
  DisbursementStatus.PAID,
  DisbursementStatus.PROCESSING,
  DisbursementStatus.PENDING,
];

@Injectable()
export class DisbursementsService {
  private resolveDisbursementAmount(enrollment: {
    allocation_amount: number | string | null | undefined;
  }): number {
    const raw = enrollment.allocation_amount;
    if (raw === null || raw === undefined || raw === '') {
      throw new BadRequestException(
        'This enrollment has no allocation amount. Set allocation_amount on the intervention enrollment before disbursing.',
      );
    }
    const amount = Number(raw);
    if (Number.isNaN(amount)) {
      throw new BadRequestException(
        'Enrollment allocation amount is not a valid number.',
      );
    }
    return amount;
  }

  private async assertBeneficiaryNotAlreadyDisbursed(
    interventionId: string,
    beneficiaryId: string,
  ): Promise<void> {
    const existing = await this.disbursementRepository.exists({
      where: {
        interventionId,
        beneficiaryId,
        status: In(BLOCKING_DISBURSEMENT_STATUSES),
      },
    });
    if (existing) {
      throw new ConflictException(
        'This beneficiary already has a disbursement or an in-progress payment for this intervention.',
      );
    }
  }

  private async findAvailableFundRequest(
    interventionId: string,
    amountNeeded: number,
  ): Promise<FundRequestEntity> {
    const fundRequests = await this.fundRequestRepository.find({
      where: {
        interventionId,
        status: FundRequestStatus.APPROVED,
      },
      relations: ['budgetLine'],
      order: { approvedAt: 'ASC' },
    });

    if (fundRequests.length === 0) {
      throw new BadRequestException(
        'No approved fund requests found for this intervention',
      );
    }

    for (const fundRequest of fundRequests) {
      const available =
        Number(fundRequest.approvedAmount) - Number(fundRequest.spentAmount);
      if (available >= amountNeeded) {
        return fundRequest;
      }
    }

    throw new BadRequestException(
      `No fund request has sufficient available balance. Amount needed: ₦${amountNeeded}. ` +
        `Please reduce the number of beneficiaries or request additional funds.`,
    );
  }

  constructor(
    @InjectRepository(DisbursementEntity)
    private readonly disbursementRepository: Repository<DisbursementEntity>,
    @InjectRepository(FundRequestEntity)
    private readonly fundRequestRepository: Repository<FundRequestEntity>,
    @InjectRepository(BudgetLineEntity)
    private readonly budgetLineRepository: Repository<BudgetLineEntity>,
    private readonly beneficiariesService: BeneficiariesService,
    private readonly interventionsService: InterventionsService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createDisbursementDto: CreateDisbursementDto,
    userId: string,
  ): Promise<DisbursementEntity> {
    const intervention = await this.interventionsService.findOne(
      createDisbursementDto.interventionId,
    );
    const beneficiary = await this.beneficiariesService.findOne(
      createDisbursementDto.beneficiaryId,
    );

    const enrollment = await this.enrollmentsService.findOne(
      createDisbursementDto.beneficiaryId,
      createDisbursementDto.interventionId,
    );

    if (!enrollment) {
      throw new BadRequestException(
        `Beneficiary is not enrolled in this intervention`,
      );
    }

    await this.assertBeneficiaryNotAlreadyDisbursed(
      intervention.id,
      beneficiary.id,
    );

    const amount = this.resolveDisbursementAmount(enrollment);

    const interventionAvailable =
      Number(intervention.budgetReceived) - Number(intervention.budgetSpent);
    if (Number(amount) > interventionAvailable) {
      throw new BadRequestException(
        `Insufficient intervention budget. Available: ₦${interventionAvailable}, Requested: ₦${amount}`,
      );
    }

    const fundRequest = await this.findAvailableFundRequest(
      intervention.id,
      amount,
    );

    const disbursementId = await this.dataSource.transaction(
      async (manager) => {
        const batchNumber = await this.generateBatchNumberWithLock(manager);

        const disbursement = manager.create(DisbursementEntity, {
          batchNumber: batchNumber,
          interventionId: intervention.id,
          beneficiaryId: beneficiary.id,
          fundRequestId: fundRequest.id,
          amount: amount,
          status: DisbursementStatus.PAID,
          paymentDate: new Date(),
          bankName:
            createDisbursementDto.bankName || beneficiary.bank || undefined,
          accountNumber:
            createDisbursementDto.accountNumber ||
            beneficiary.account_number ||
            undefined,
          referenceNumber: createDisbursementDto.referenceNumber || undefined,
          notes: createDisbursementDto.notes || undefined,
          createdById: userId,
        });
        const savedDisbursement = await manager.save(
          DisbursementEntity,
          disbursement,
        );

        await manager.update(
          InterventionEntity,
          { id: intervention.id },
          { budgetSpent: Number(intervention.budgetSpent) + Number(amount) },
        );

        await manager.update(
          FundRequestEntity,
          { id: fundRequest.id },
          { spentAmount: Number(fundRequest.spentAmount) + Number(amount) },
        );

        const budgetLine = await manager.findOne(BudgetLineEntity, {
          where: { id: fundRequest.budgetLine.id },
        });
        if (budgetLine) {
          budgetLine.spentAmount =
            Number(budgetLine.spentAmount) + Number(amount);
          budgetLine.remainingAmount =
            Number(budgetLine.allocatedAmount) -
            Number(budgetLine.committedAmount);
          await manager.save(BudgetLineEntity, budgetLine);
        }

        await manager.update(
          EnrollmentEntity,
          { id: enrollment.id },
          { status: EnrollmentStatus.COMPLETED },
        );

        return savedDisbursement.id;
      },
    );

    return await this.findOne(disbursementId);
  }

  async createBatch(
    createBatchDto: CreateBatchDisbursementDto,
    userId: string,
  ): Promise<DisbursementEntity[]> {
    const intervention = await this.interventionsService.findOne(
      createBatchDto.interventionId,
    );

    const batchBeneficiaryIds = createBatchDto.disbursements.map(
      (d) => d.beneficiaryId,
    );
    const uniqueBeneficiaryIds = new Set(batchBeneficiaryIds);

    if (createBatchDto.disbursements.length === 0) {
      throw new BadRequestException(
        'Batch must contain at least one disbursement',
      );
    }

    if (uniqueBeneficiaryIds.size !== batchBeneficiaryIds.length) {
      throw new BadRequestException(
        'Duplicate beneficiaries in the batch; each beneficiary may only appear once.',
      );
    }

    const enrollments = await this.enrollmentsService.findByIntervention(
      createBatchDto.interventionId,
    );

    const enrollmentMap = new Map(
      enrollments.map((e) => [e.beneficiary_id, e]),
    );

    for (const beneficiaryId of uniqueBeneficiaryIds) {
      if (!enrollmentMap.has(beneficiaryId)) {
        throw new BadRequestException(
          `Beneficiary ${beneficiaryId} is not enrolled in this intervention`,
        );
      }
    }

    const alreadyDisbursed = await this.disbursementRepository.exists({
      where: {
        interventionId: intervention.id,
        beneficiaryId: In([...uniqueBeneficiaryIds]),
        status: In(BLOCKING_DISBURSEMENT_STATUSES),
      },
    });
    if (alreadyDisbursed) {
      throw new ConflictException(
        'One or more beneficiaries already have a disbursement or an in-progress payment for this intervention.',
      );
    }

    const batchEnrollments = Array.from(uniqueBeneficiaryIds).map(
      (id) => enrollmentMap.get(id)!,
    );
    const totalAmount = batchEnrollments.reduce(
      (sum, en) => sum + this.resolveDisbursementAmount(en),
      0,
    );

    const interventionAvailable =
      Number(intervention.budgetReceived) - Number(intervention.budgetSpent);
    if (totalAmount > interventionAvailable) {
      throw new BadRequestException(
        `Insufficient intervention budget. Available: ₦${interventionAvailable}, Required: ₦${totalAmount}`,
      );
    }

    const fundRequest = await this.findAvailableFundRequest(
      intervention.id,
      totalAmount,
    );

    return await this.dataSource.transaction(async (manager) => {
      const batchNumber = await this.generateBatchNumberWithLock(manager);
      const disbursements: DisbursementEntity[] = [];
      const enrollmentIdsToComplete: string[] = [];

      for (const item of createBatchDto.disbursements) {
        const beneficiary = await this.beneficiariesService.findOne(
          item.beneficiaryId,
        );

        const enrollment = enrollments.find(
          (enrollment) => enrollment.beneficiary_id === beneficiary.id,
        );

        if (!enrollment) {
          throw new BadRequestException(
            `Beneficiary is not enrolled in this intervention`,
          );
        }

        const amount = this.resolveDisbursementAmount(enrollment);

        const disbursement = manager.create(DisbursementEntity, {
          batchNumber: batchNumber,
          interventionId: intervention.id,
          beneficiaryId: beneficiary.id,
          fundRequestId: fundRequest.id,
          amount: amount,
          status: DisbursementStatus.PAID,
          paymentDate: new Date(),
          bankName: item.bankName || beneficiary.bank || undefined,
          accountNumber:
            item.accountNumber || beneficiary.account_number || undefined,
          referenceNumber: createBatchDto.referenceNumber || undefined,
          notes: item.notes || undefined,
          createdById: userId,
        });

        disbursements.push(disbursement);
        enrollmentIdsToComplete.push(enrollment.id);
      }

      await manager.save(DisbursementEntity, disbursements);

      await manager.update(
        InterventionEntity,
        { id: intervention.id },
        { budgetSpent: Number(intervention.budgetSpent) + Number(totalAmount) },
      );

      await manager.update(
        FundRequestEntity,
        { id: fundRequest.id },
        { spentAmount: Number(fundRequest.spentAmount) + Number(totalAmount) },
      );

      const budgetLine = await manager.findOne(BudgetLineEntity, {
        where: { id: fundRequest.budgetLine.id },
      });
      if (budgetLine) {
        budgetLine.spentAmount =
          Number(budgetLine.spentAmount) + Number(totalAmount);
        budgetLine.remainingAmount =
          Number(budgetLine.allocatedAmount) -
          Number(budgetLine.committedAmount);
        await manager.save(BudgetLineEntity, budgetLine);
      }

      await manager.update(
        EnrollmentEntity,
        { id: In(enrollmentIdsToComplete) },
        { status: EnrollmentStatus.COMPLETED },
      );

      /* return await manager
        .createQueryBuilder(DisbursementEntity, 'disbursement')
        .leftJoinAndSelect('disbursement.intervention', 'intervention')
        .leftJoinAndSelect('disbursement.beneficiary', 'beneficiary')
        .leftJoinAndSelect('disbursement.fundRequest', 'fundRequest')
        .leftJoinAndSelect('fundRequest.budgetLine', 'budgetLine')
        .leftJoin('disbursement.createdBy', 'createdBy')
        .addSelect(['createdBy.id', 'createdBy.email', 'createdBy.full_name'])
        .where('disbursement.batchNumber = :batchNumber', { batchNumber })
        .getMany(); */

      return await manager
        .createQueryBuilder(DisbursementEntity, 'disbursement')
        .leftJoin('disbursement.createdBy', 'createdBy')
        .addSelect(['createdBy.id', 'createdBy.email', 'createdBy.full_name'])
        .where('disbursement.batchNumber = :batchNumber', { batchNumber })
        .getMany();
    });
  }

  async createBatchForPendingEnrollments(
    interventionId: string,
    userId: string,
    referenceNumber?: string,
  ): Promise<DisbursementEntity[]> {
    const intervention =
      await this.interventionsService.findOne(interventionId);

    const allEnrollments =
      await this.enrollmentsService.findByIntervention(interventionId);

    const pendingEnrollments = allEnrollments.filter(
      (e) => e.status === EnrollmentStatus.PENDING,
    );

    if (pendingEnrollments.length === 0) {
      throw new BadRequestException(
        'No pending enrollments found for this intervention',
      );
    }

    const pendingBeneficiaryIds = pendingEnrollments.map(
      (e) => e.beneficiary_id,
    );

    const alreadyDisbursedIds = await this.disbursementRepository.find({
      where: {
        interventionId: intervention.id,
        beneficiaryId: In(pendingBeneficiaryIds),
        status: In(BLOCKING_DISBURSEMENT_STATUSES),
      },
      select: ['beneficiaryId'],
    });

    const disbursedBeneficiaryIds = new Set(
      alreadyDisbursedIds.map((d) => d.beneficiaryId),
    );

    const eligibleEnrollments = pendingEnrollments.filter(
      (e) => !disbursedBeneficiaryIds.has(e.beneficiary_id),
    );

    if (eligibleEnrollments.length === 0) {
      throw new BadRequestException(
        'No eligible pending enrollments to disburse (all have existing disbursements)',
      );
    }

    const totalAmount = eligibleEnrollments.reduce(
      (sum, en) => sum + this.resolveDisbursementAmount(en),
      0,
    );

    const interventionAvailable =
      Number(intervention.budgetReceived) - Number(intervention.budgetSpent);
    if (totalAmount > interventionAvailable) {
      throw new BadRequestException(
        `Insufficient intervention budget. Available: ₦${interventionAvailable}, Required: ₦${totalAmount}`,
      );
    }

    const fundRequest = await this.findAvailableFundRequest(
      intervention.id,
      totalAmount,
    );

    return await this.dataSource.transaction(async (manager) => {
      const batchNumber = await this.generateBatchNumberWithLock(manager);
      const disbursements: DisbursementEntity[] = [];
      const enrollmentIdsToComplete: string[] = [];

      for (const enrollment of eligibleEnrollments) {
        const beneficiary = await this.beneficiariesService.findOne(
          enrollment.beneficiary_id,
        );

        const amount = this.resolveDisbursementAmount(enrollment);

        const disbursement = manager.create(DisbursementEntity, {
          batchNumber: batchNumber,
          interventionId: intervention.id,
          beneficiaryId: beneficiary.id,
          fundRequestId: fundRequest.id,
          amount: amount,
          status: DisbursementStatus.PAID,
          paymentDate: new Date(),
          bankName: beneficiary.bank || undefined,
          accountNumber: beneficiary.account_number || undefined,
          referenceNumber: referenceNumber || undefined,
          createdById: userId,
        });

        disbursements.push(disbursement);
        enrollmentIdsToComplete.push(enrollment.id);
      }

      await manager.save(DisbursementEntity, disbursements);

      await manager.update(
        InterventionEntity,
        { id: intervention.id },
        { budgetSpent: Number(intervention.budgetSpent) + Number(totalAmount) },
      );

      await manager.update(
        FundRequestEntity,
        { id: fundRequest.id },
        { spentAmount: Number(fundRequest.spentAmount) + Number(totalAmount) },
      );

      const budgetLine = await manager.findOne(BudgetLineEntity, {
        where: { id: fundRequest.budgetLine.id },
      });
      if (budgetLine) {
        budgetLine.spentAmount =
          Number(budgetLine.spentAmount) + Number(totalAmount);
        budgetLine.remainingAmount =
          Number(budgetLine.allocatedAmount) -
          Number(budgetLine.committedAmount);
        await manager.save(BudgetLineEntity, budgetLine);
      }

      await manager.update(
        EnrollmentEntity,
        { id: In(enrollmentIdsToComplete) },
        { status: EnrollmentStatus.COMPLETED },
      );

      /* return await manager
        .createQueryBuilder(DisbursementEntity, 'disbursement')
        .leftJoinAndSelect('disbursement.intervention', 'intervention')
        .leftJoinAndSelect('disbursement.beneficiary', 'beneficiary')
        .leftJoinAndSelect('disbursement.fundRequest', 'fundRequest')
        .leftJoinAndSelect('fundRequest.budgetLine', 'budgetLine')
        .leftJoin('disbursement.createdBy', 'createdBy')
        .addSelect(['createdBy.id', 'createdBy.email', 'createdBy.full_name'])
        .where('disbursement.batchNumber = :batchNumber', { batchNumber })
        .getMany(); */

      return await manager
        .createQueryBuilder(DisbursementEntity, 'disbursement')
        .leftJoin('disbursement.createdBy', 'createdBy')
        .addSelect(['createdBy.id', 'createdBy.email', 'createdBy.full_name'])
        .where('disbursement.batchNumber = :batchNumber', { batchNumber })
        .getMany();
    });
  }

  async findAll(filters?: {
    status?: DisbursementStatus;
    interventionId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<DisbursementEntity[]> {
    const queryBuilder = this.disbursementRepository
      .createQueryBuilder('disbursement')
      .leftJoinAndSelect('disbursement.intervention', 'intervention')
      .leftJoinAndSelect('disbursement.beneficiary', 'beneficiary')
      .leftJoinAndSelect('disbursement.fundRequest', 'fundRequest')
      .leftJoinAndSelect('fundRequest.budgetLine', 'budgetLine')
      .leftJoin('disbursement.createdBy', 'createdBy')
      .addSelect(['createdBy.id', 'createdBy.email', 'createdBy.full_name'])
      .orderBy('disbursement.createdAt', 'DESC');

    if (filters?.status) {
      queryBuilder.andWhere('disbursement.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.interventionId) {
      queryBuilder.andWhere('disbursement.intervention_id = :interventionId', {
        interventionId: filters.interventionId,
      });
    }

    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('disbursement.created_at BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate,
      });
    }

    return await queryBuilder.getMany();
  }

  async findOne(id: string): Promise<DisbursementEntity> {
    const disbursement = await this.disbursementRepository
      .createQueryBuilder('disbursement')
      .leftJoinAndSelect('disbursement.intervention', 'intervention')
      .leftJoinAndSelect('disbursement.beneficiary', 'beneficiary')
      .leftJoinAndSelect('disbursement.fundRequest', 'fundRequest')
      .leftJoinAndSelect('fundRequest.budgetLine', 'budgetLine')
      .leftJoin('disbursement.createdBy', 'createdBy')
      .addSelect(['createdBy.id', 'createdBy.email', 'createdBy.full_name'])
      .leftJoin('disbursement.approvedBy', 'approvedBy')
      .addSelect(['approvedBy.id', 'approvedBy.email', 'approvedBy.full_name'])
      .where('disbursement.id = :id', { id })
      .getOne();

    if (!disbursement) {
      throw new NotFoundException(`Disbursement with ID ${id} not found`);
    }

    return disbursement;
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateDisbursementStatusDto,
    userId: string,
  ): Promise<DisbursementEntity> {
    const disbursement = await this.findOne(id);

    disbursement.status = updateStatusDto.status;
    if (updateStatusDto.notes) {
      disbursement.notes = updateStatusDto.notes;
    }

    if (updateStatusDto.status === DisbursementStatus.PAID) {
      disbursement.approvedById = userId;
      if (!disbursement.paymentDate) {
        disbursement.paymentDate = new Date();
      }
    }

    return await this.disbursementRepository.save(disbursement);
  }

  async getRecent(limit: number = 10): Promise<DisbursementEntity[]> {
    return await this.disbursementRepository
      .createQueryBuilder('disbursement')
      .leftJoinAndSelect('disbursement.intervention', 'intervention')
      .leftJoinAndSelect('disbursement.beneficiary', 'beneficiary')
      .leftJoinAndSelect('disbursement.fundRequest', 'fundRequest')
      .leftJoinAndSelect('fundRequest.budgetLine', 'budgetLine')
      .leftJoin('disbursement.createdBy', 'createdBy')
      .addSelect(['createdBy.id', 'createdBy.email', 'createdBy.full_name'])
      .orderBy('disbursement.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async getByIntervention(): Promise<
    Array<{
      interventionId: string;
      interventionName: string;
      totalAmount: number;
      count: number;
    }>
  > {
    const result = await this.disbursementRepository
      .createQueryBuilder('disbursement')
      .leftJoin('disbursement.intervention', 'intervention')
      .select('intervention.id', 'interventionId')
      .addSelect('intervention.name', 'interventionName')
      .addSelect('SUM(disbursement.amount)', 'totalAmount')
      .addSelect('COUNT(disbursement.id)', 'count')
      .groupBy('intervention.id')
      .addGroupBy('intervention.name')
      .getRawMany<{
        interventionId: string;
        interventionName: string;
        totalAmount: string;
        count: string;
      }>();

    return result.map((item) => ({
      interventionId: item.interventionId,
      interventionName: item.interventionName,
      totalAmount: Number(item.totalAmount),
      count: Number(item.count),
    }));
  }

  private async generateBatchNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const lastBatch = await this.disbursementRepository.findOne({
      where: {},
      order: { createdAt: 'DESC' },
    });

    let increment = 1;
    if (lastBatch && lastBatch.batchNumber.startsWith(`BATCH-${year}`)) {
      const lastIncrement = parseInt(
        lastBatch.batchNumber.split('-')[2] || '0',
      );
      increment = lastIncrement + 1;
    }

    return `BATCH-${year}-${increment.toString().padStart(3, '0')}`;
  }

  private async generateBatchNumberWithLock(
    manager: EntityManager,
  ): Promise<string> {
    const year = new Date().getFullYear();

    const lastBatch = await manager
      .createQueryBuilder(DisbursementEntity, 'disbursement')
      .orderBy('disbursement.createdAt', 'DESC')
      .setLock('pessimistic_write')
      .getOne();

    let increment = 1;
    if (lastBatch && lastBatch.batchNumber.startsWith(`BATCH-${year}`)) {
      const lastIncrement = parseInt(
        lastBatch.batchNumber.split('-')[2] || '0',
      );
      increment = lastIncrement + 1;
    }

    return `BATCH-${year}-${increment.toString().padStart(3, '0')}`;
  }
}
