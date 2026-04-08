import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FundRequestEntity,
  FundRequestStatus,
} from './entities/fund-request.entity';
import { CreateFundRequestDto } from './dto/create-fund-request.dto';
import { UpdateFundRequestDto } from './dto/update-fund-request.dto';
import { ApproveFundRequestDto } from './dto/approve-fund-request.dto';
import { RejectFundRequestDto } from './dto/reject-fund-request.dto';
import { BudgetLineEntity } from '../budget-lines/entities/budget-line.entity';
import { InterventionEntity } from '../interventions/entities/intervention.entity';

@Injectable()
export class FundRequestsService {
  constructor(
    @InjectRepository(FundRequestEntity)
    private readonly fundRequestRepository: Repository<FundRequestEntity>,
    @InjectRepository(BudgetLineEntity)
    private readonly budgetLineRepository: Repository<BudgetLineEntity>,
    @InjectRepository(InterventionEntity)
    private readonly interventionRepository: Repository<InterventionEntity>,
  ) {}

  async create(
    createDto: CreateFundRequestDto,
    userId: string,
  ): Promise<FundRequestEntity> {
    const budgetLine = await this.budgetLineRepository.findOne({
      where: { id: createDto.budgetLineId },
    });

    if (!budgetLine) {
      throw new NotFoundException(
        `Budget line with ID ${createDto.budgetLineId} not found`,
      );
    }

    const availableAmount =
      budgetLine.allocatedAmount - budgetLine.committedAmount;
    if (createDto.requestedAmount > availableAmount) {
      throw new BadRequestException(
        `Requested amount exceeds available budget. Available: ${availableAmount}`,
      );
    }

    if (createDto.interventionId) {
      const intervention = await this.interventionRepository.findOne({
        where: { id: createDto.interventionId },
      });

      if (!intervention) {
        throw new NotFoundException(
          `Intervention with ID ${createDto.interventionId} not found`,
        );
      }
    }

    const fundRequest = this.fundRequestRepository.create({
      title: createDto.title,
      requestedAmount: createDto.requestedAmount,
      justification: createDto.justification,
      supportingDocuments: createDto.supportingDocuments,
      notes: createDto.notes,
      budgetLineId: createDto.budgetLineId,
      interventionId: createDto.interventionId,
      requestedById: userId,
    });

    return this.fundRequestRepository.save(fundRequest);
  }

  async findAll(fiscalYearId?: string): Promise<FundRequestEntity[]> {
    const queryBuilder = this.fundRequestRepository
      .createQueryBuilder('fundRequest')
      .leftJoinAndSelect('fundRequest.budgetLine', 'budgetLine')
      .leftJoinAndSelect('budgetLine.fiscalYear', 'fiscalYear')
      .leftJoinAndSelect('budgetLine.department', 'department')
      .leftJoinAndSelect('fundRequest.intervention', 'intervention')
      .leftJoin('fundRequest.requestedBy', 'requestedBy')
      .addSelect([
        'requestedBy.id',
        'requestedBy.email',
        'requestedBy.full_name',
      ])
      .leftJoin('fundRequest.approvedBy', 'approvedBy')
      .addSelect(['approvedBy.id', 'approvedBy.email', 'approvedBy.full_name'])
      .orderBy('fundRequest.createdAt', 'DESC');

    if (fiscalYearId) {
      queryBuilder.where('fiscalYear.id = :fiscalYearId', {
        fiscalYearId,
      });
    }

    return queryBuilder.getMany();
  }

  async findPending(fiscalYearId?: string): Promise<FundRequestEntity[]> {
    let targetFiscalYearId = fiscalYearId;

    // If no fiscal year provided, get the latest active one
    if (!targetFiscalYearId) {
      const latestFiscalYear = await this.fundRequestRepository.manager
        .getRepository('FiscalYearEntity')
        .findOne({
          where: { isActive: true },
          order: { startDate: 'DESC' },
        });

      if (latestFiscalYear) {
        targetFiscalYearId = latestFiscalYear.id as string;
      }
    }

    const queryBuilder = this.fundRequestRepository
      .createQueryBuilder('fundRequest')
      .leftJoinAndSelect('fundRequest.budgetLine', 'budgetLine')
      .leftJoinAndSelect('budgetLine.fiscalYear', 'fiscalYear')
      .leftJoinAndSelect('budgetLine.department', 'department')
      .leftJoinAndSelect('fundRequest.intervention', 'intervention')
      .leftJoinAndSelect('fundRequest.requestedBy', 'requestedBy')
      .where('fundRequest.status = :status', {
        status: FundRequestStatus.PENDING,
      })
      .orderBy('fundRequest.createdAt', 'DESC');

    if (targetFiscalYearId) {
      queryBuilder.andWhere('fiscalYear.id = :fiscalYearId', {
        fiscalYearId: targetFiscalYearId,
      });
    }

    return queryBuilder.getMany();
  }

  async findByBudgetLine(budgetLineId: string): Promise<FundRequestEntity[]> {
    return this.fundRequestRepository
      .createQueryBuilder('fundRequest')
      .leftJoinAndSelect('fundRequest.intervention', 'intervention')
      .leftJoin('fundRequest.requestedBy', 'requestedBy')
      .addSelect([
        'requestedBy.id',
        'requestedBy.email',
        'requestedBy.full_name',
      ])
      .leftJoin('fundRequest.approvedBy', 'approvedBy')
      .addSelect(['approvedBy.id', 'approvedBy.email', 'approvedBy.full_name'])
      .where('fundRequest.budgetLineId = :budgetLineId', { budgetLineId })
      .orderBy('fundRequest.createdAt', 'DESC')
      .getMany();
  }

  async findByIntervention(
    interventionId: string,
  ): Promise<FundRequestEntity[]> {
    return this.fundRequestRepository
      .createQueryBuilder('fundRequest')
      .leftJoinAndSelect('fundRequest.budgetLine', 'budgetLine')
      .leftJoin('fundRequest.requestedBy', 'requestedBy')
      .addSelect([
        'requestedBy.id',
        'requestedBy.email',
        'requestedBy.full_name',
      ])
      .leftJoin('fundRequest.approvedBy', 'approvedBy')
      .addSelect(['approvedBy.id', 'approvedBy.email', 'approvedBy.full_name'])
      .where('fundRequest.interventionId = :interventionId', { interventionId })
      .orderBy('fundRequest.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<FundRequestEntity> {
    const fundRequest = await this.fundRequestRepository
      .createQueryBuilder('fundRequest')
      .leftJoinAndSelect('fundRequest.budgetLine', 'budgetLine')
      .leftJoinAndSelect('fundRequest.intervention', 'intervention')
      .leftJoin('fundRequest.requestedBy', 'requestedBy')
      .addSelect([
        'requestedBy.id',
        'requestedBy.email',
        'requestedBy.full_name',
      ])
      .leftJoin('fundRequest.approvedBy', 'approvedBy')
      .addSelect(['approvedBy.id', 'approvedBy.email', 'approvedBy.full_name'])
      .where('fundRequest.id = :id', { id })
      .getOne();

    if (!fundRequest) {
      throw new NotFoundException(`Fund request with ID ${id} not found`);
    }

    return fundRequest;
  }

  async update(
    id: string,
    updateDto: UpdateFundRequestDto,
  ): Promise<FundRequestEntity> {
    const fundRequest = await this.findOne(id);

    if (fundRequest.status !== FundRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending fund requests can be updated',
      );
    }

    Object.assign(fundRequest, updateDto);
    return this.fundRequestRepository.save(fundRequest);
  }

  async approve(
    id: string,
    approveDto: ApproveFundRequestDto,
    userId: string,
  ): Promise<FundRequestEntity> {
    const fundRequest = await this.findOne(id);

    if (fundRequest.status !== FundRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending fund requests can be approved',
      );
    }

    // Validate approved amount doesn't exceed requested amount
    if (approveDto.approvedAmount > fundRequest.requestedAmount) {
      throw new BadRequestException(
        `Approved amount (${approveDto.approvedAmount}) cannot exceed requested amount (${fundRequest.requestedAmount})`,
      );
    }

    const budgetLine = await this.budgetLineRepository.findOne({
      where: { id: fundRequest.budgetLine.id },
    });

    if (!budgetLine) {
      throw new NotFoundException(
        `Budget line with ID ${fundRequest.budgetLine.id} not found`,
      );
    }

    const availableAmount =
      budgetLine.allocatedAmount - budgetLine.committedAmount;
    if (approveDto.approvedAmount > availableAmount) {
      throw new BadRequestException(
        `Approved amount exceeds available budget. Available: ${availableAmount}`,
      );
    }

    fundRequest.approvedAmount = approveDto.approvedAmount;
    fundRequest.status = FundRequestStatus.APPROVED;
    fundRequest.approvedById = userId;
    fundRequest.approvedAt = new Date();
    fundRequest.notes = approveDto.notes || fundRequest.notes;

    // Update budget line committed amount
    budgetLine.committedAmount =
      Number(budgetLine.committedAmount) + Number(approveDto.approvedAmount);
    budgetLine.remainingAmount =
      Number(budgetLine.allocatedAmount) - Number(budgetLine.committedAmount);

    if (fundRequest.intervention) {
      // Intervention-linked fund request: funds flow to intervention for later disbursement
      const intervention = await this.interventionRepository.findOne({
        where: { id: fundRequest.intervention.id },
      });

      if (!intervention) {
        throw new NotFoundException(
          `Intervention with ID ${fundRequest.intervention.id} not found`,
        );
      }

      intervention.budgetReceived =
        Number(intervention.budgetReceived) + Number(approveDto.approvedAmount);
      await this.interventionRepository.save(intervention);
    } else {
      // Non-intervention fund request (e.g., Stationery Procurement, Vehicle Maintenance)
      // These are automatically marked as spent upon approval since they represent
      // direct operational expenses not tied to beneficiary disbursements.
      budgetLine.spentAmount =
        Number(budgetLine.spentAmount) + Number(approveDto.approvedAmount);
      budgetLine.remainingAmount =
        Number(budgetLine.allocatedAmount) - Number(budgetLine.committedAmount);
    }

    await this.budgetLineRepository.save(budgetLine);

    return this.fundRequestRepository.save(fundRequest);
  }

  async reject(
    id: string,
    rejectDto: RejectFundRequestDto,
    userId: string,
  ): Promise<FundRequestEntity> {
    const fundRequest = await this.findOne(id);

    if (fundRequest.status !== FundRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending fund requests can be rejected',
      );
    }

    fundRequest.status = FundRequestStatus.REJECTED;
    fundRequest.approvedById = userId;
    fundRequest.approvedAt = new Date();
    fundRequest.notes = rejectDto.notes;

    return this.fundRequestRepository.save(fundRequest);
  }

  async remove(id: string): Promise<void> {
    const fundRequest = await this.findOne(id);

    if (fundRequest.status !== FundRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending fund requests can be deleted',
      );
    }

    await this.fundRequestRepository.remove(fundRequest);
  }
}
