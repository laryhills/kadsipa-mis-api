import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { DisbursementEntity, DisbursementStatus } from './entities/disbursement.entity';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';
import { CreateBatchDisbursementDto } from './dto/create-batch-disbursement.dto';
import { UpdateDisbursementStatusDto } from './dto/update-disbursement-status.dto';
import { BudgetLinesService } from '../budget-lines/budget-lines.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import { InterventionsService } from '../interventions/interventions.service';

@Injectable()
export class DisbursementsService {
  constructor(
    @InjectRepository(DisbursementEntity)
    private readonly disbursementRepository: Repository<DisbursementEntity>,
    private readonly budgetLinesService: BudgetLinesService,
    private readonly beneficiariesService: BeneficiariesService,
    private readonly interventionsService: InterventionsService,
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
    const budgetLine = await this.budgetLinesService.findOne(
      createDisbursementDto.budgetLineId,
    );

    // Validate intervention has sufficient funds (budgetReceived - budgetSpent)
    const interventionAvailable =
      Number(intervention.budgetReceived) - Number(intervention.budgetSpent);
    if (Number(createDisbursementDto.amount) > interventionAvailable) {
      throw new BadRequestException(
        `Insufficient intervention budget. Available: ₦${interventionAvailable}, Requested: ₦${createDisbursementDto.amount}`,
      );
    }

    const batchNumber = await this.generateBatchNumber();

    const disbursementData = {
      batchNumber: batchNumber,
      intervention: { id: intervention.id } as any,
      beneficiary: { id: beneficiary.id } as any,
      budgetLine: { id: budgetLine.id } as any,
      amount: createDisbursementDto.amount,
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
      createdBy: { id: userId } as any,
    };

    const disbursement = this.disbursementRepository.create(disbursementData);
    const savedDisbursement = (await this.disbursementRepository.save(
      disbursement,
    )) as DisbursementEntity;

    // Update budget line spent amount
    await this.budgetLinesService.recordSpending(
      budgetLine.id,
      createDisbursementDto.amount,
    );

    // Update intervention spent amount
    intervention.budgetSpent =
      Number(intervention.budgetSpent) + Number(createDisbursementDto.amount);
    await this.interventionsService.update(intervention.id, {
      budgetSpent: intervention.budgetSpent,
    } as any);

    return await this.findOne(savedDisbursement.id);
  }

  async createBatch(
    createBatchDto: CreateBatchDisbursementDto,
    userId: string,
  ): Promise<DisbursementEntity[]> {
    const intervention = await this.interventionsService.findOne(
      createBatchDto.interventionId,
    );
    const budgetLine = await this.budgetLinesService.findOne(
      createBatchDto.budgetLineId,
    );

    const totalAmount = createBatchDto.disbursements.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );

    // Validate intervention has sufficient funds (budgetReceived - budgetSpent)
    const interventionAvailable =
      Number(intervention.budgetReceived) - Number(intervention.budgetSpent);
    if (totalAmount > interventionAvailable) {
      throw new BadRequestException(
        `Insufficient intervention budget. Available: ₦${interventionAvailable}, Required: ₦${totalAmount}`,
      );
    }

    const batchNumber = await this.generateBatchNumber();
    const disbursements: DisbursementEntity[] = [];

    for (const item of createBatchDto.disbursements) {
      const beneficiary = await this.beneficiariesService.findOne(
        item.beneficiaryId,
      );

      const disbursementData = {
        batchNumber: batchNumber,
        intervention: { id: intervention.id } as any,
        beneficiary: { id: beneficiary.id } as any,
        budgetLine: { id: budgetLine.id } as any,
        amount: item.amount,
        status: DisbursementStatus.PAID,
        paymentDate: new Date(),
        bankName: item.bankName || beneficiary.bank || undefined,
        accountNumber:
          item.accountNumber || beneficiary.account_number || undefined,
        referenceNumber: createBatchDto.referenceNumber || undefined,
        notes: item.notes || undefined,
        createdBy: { id: userId } as any,
      };

      const disbursement =
        this.disbursementRepository.create(disbursementData);
      disbursements.push(disbursement);
    }

    await this.disbursementRepository.save(disbursements);

    // Update budget line spent amount
    await this.budgetLinesService.recordSpending(budgetLine.id, totalAmount);

    // Update intervention spent amount
    intervention.budgetSpent =
      Number(intervention.budgetSpent) + Number(totalAmount);
    await this.interventionsService.update(intervention.id, {
      budgetSpent: intervention.budgetSpent,
    } as any);

    return await this.disbursementRepository.find({
      where: { batchNumber },
      relations: ['beneficiary', 'budgetLine', 'createdBy'],
    });
  }

  async findAll(filters?: {
    status?: DisbursementStatus;
    interventionId?: string;
    budgetLineId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<DisbursementEntity[]> {
    const queryBuilder = this.disbursementRepository
      .createQueryBuilder('disbursement')
      .leftJoinAndSelect('disbursement.intervention', 'intervention')
      .leftJoinAndSelect('disbursement.beneficiary', 'beneficiary')
      .leftJoinAndSelect('disbursement.budgetLine', 'budgetLine')
      .leftJoinAndSelect('disbursement.createdBy', 'createdBy')
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

    if (filters?.budgetLineId) {
      queryBuilder.andWhere('disbursement.budget_line_id = :budgetLineId', {
        budgetLineId: filters.budgetLineId,
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
    const disbursement = await this.disbursementRepository.findOne({
      where: { id },
      relations: ['intervention', 'beneficiary', 'budgetLine', 'createdBy', 'approvedBy'],
    });

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

    if (updateStatusDto.status === DisbursementStatus.PAID && !disbursement.paymentDate) {
      disbursement.paymentDate = new Date();
    }

    return await this.disbursementRepository.save(disbursement);
  }

  async getRecent(limit: number = 10): Promise<DisbursementEntity[]> {
    return await this.disbursementRepository.find({
      relations: ['intervention', 'beneficiary', 'budgetLine', 'createdBy'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getByCategory(): Promise<any[]> {
    const result = await this.disbursementRepository
      .createQueryBuilder('disbursement')
      .leftJoinAndSelect('disbursement.budgetLine', 'budgetLine')
      .select('budgetLine.category', 'category')
      .addSelect('budgetLine.name', 'categoryName')
      .addSelect('SUM(disbursement.amount)', 'totalAmount')
      .addSelect('COUNT(disbursement.id)', 'count')
      .groupBy('budgetLine.category')
      .addGroupBy('budgetLine.name')
      .getRawMany();

    return result.map((item) => ({
      category: item.category,
      categoryName: item.categoryName,
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
}
