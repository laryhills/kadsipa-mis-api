import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetLineEntity } from './entities/budget-line.entity';
import { CreateBudgetLineDto } from './dto/create-budget-line.dto';
import { UpdateBudgetLineDto } from './dto/update-budget-line.dto';
import { FiscalYearEntity } from '../fiscal-years/entities/fiscal-year.entity';
import { DepartmentEntity } from '../departments/entities/department.entity';

@Injectable()
export class BudgetLinesService {
  constructor(
    @InjectRepository(BudgetLineEntity)
    private readonly budgetLineRepository: Repository<BudgetLineEntity>,
    @InjectRepository(FiscalYearEntity)
    private readonly fiscalYearRepository: Repository<FiscalYearEntity>,
    @InjectRepository(DepartmentEntity)
    private readonly departmentRepository: Repository<DepartmentEntity>,
  ) {}

  async create(
    createBudgetLineDto: CreateBudgetLineDto,
    userId: string,
  ): Promise<BudgetLineEntity> {
    const fiscalYear = await this.fiscalYearRepository.findOne({
      where: { id: createBudgetLineDto.fiscalYearId },
    });

    if (!fiscalYear) {
      throw new NotFoundException(
        `Fiscal year with ID ${createBudgetLineDto.fiscalYearId} not found`,
      );
    }

    const department = await this.departmentRepository.findOne({
      where: { id: createBudgetLineDto.departmentId },
    });

    if (!department) {
      throw new NotFoundException(
        `Department with ID ${createBudgetLineDto.departmentId} not found`,
      );
    }

    const budgetLine = this.budgetLineRepository.create({
      ...createBudgetLineDto,
      fiscalYear,
      department,
      remainingAmount: createBudgetLineDto.allocatedAmount,
      createdById: userId,
    });

    return await this.budgetLineRepository.save(budgetLine);
  }

  async findAll(fiscalYearId?: string): Promise<BudgetLineEntity[]> {
    const queryBuilder = this.budgetLineRepository
      .createQueryBuilder('budgetLine')
      .leftJoinAndSelect('budgetLine.fiscalYear', 'fiscalYear')
      .leftJoinAndSelect('budgetLine.department', 'department')
      .leftJoin('budgetLine.createdBy', 'createdBy')
      .addSelect(['createdBy.id', 'createdBy.email', 'createdBy.full_name'])
      .orderBy('budgetLine.createdAt', 'DESC');

    if (fiscalYearId) {
      queryBuilder.where('"budgetLine"."fiscal_year_id" = :fiscalYearId', {
        fiscalYearId,
      });
    }

    return await queryBuilder.getMany();
  }

  async findOne(id: string): Promise<BudgetLineEntity> {
    const budgetLine = await this.budgetLineRepository
      .createQueryBuilder('budgetLine')
      .leftJoinAndSelect('budgetLine.fiscalYear', 'fiscalYear')
      .leftJoinAndSelect('budgetLine.department', 'department')
      .leftJoinAndSelect('budgetLine.fundRequests', 'fundRequests')
      .leftJoin('budgetLine.createdBy', 'createdBy')
      .addSelect(['createdBy.id', 'createdBy.email', 'createdBy.full_name'])
      .where('"budgetLine"."id" = :id', { id })
      .getOne();

    if (!budgetLine) {
      throw new NotFoundException(`Budget line with ID ${id} not found`);
    }

    return budgetLine;
  }

  async update(
    id: string,
    updateBudgetLineDto: UpdateBudgetLineDto,
  ): Promise<BudgetLineEntity> {
    const budgetLine = await this.findOne(id);

    if (updateBudgetLineDto.allocatedAmount !== undefined) {
      budgetLine.allocatedAmount = updateBudgetLineDto.allocatedAmount;
      budgetLine.remainingAmount =
        updateBudgetLineDto.allocatedAmount - budgetLine.spentAmount;

      if (budgetLine.committedAmount > budgetLine.allocatedAmount) {
        throw new BadRequestException(
          `Cannot reduce allocated amount below committed amount (₦${budgetLine.committedAmount})`,
        );
      }
    }

    Object.assign(budgetLine, updateBudgetLineDto);
    return await this.budgetLineRepository.save(budgetLine);
  }

  async remove(id: string): Promise<void> {
    const budgetLine = await this.findOne(id);

    if (budgetLine.committedAmount > 0) {
      throw new BadRequestException(
        'Cannot delete budget line with committed interventions',
      );
    }

    if (budgetLine.spentAmount > 0) {
      throw new BadRequestException(
        'Cannot delete budget line with disbursements',
      );
    }

    await this.budgetLineRepository.remove(budgetLine);
  }

  async getBalance(id: string) {
    const budgetLine = await this.findOne(id);

    return {
      budgetLineId: budgetLine.id,
      name: budgetLine.name,
      category: budgetLine.category,
      fiscalYear: budgetLine.fiscalYear,
      allocatedAmount: Number(budgetLine.allocatedAmount),
      committedAmount: Number(budgetLine.committedAmount),
      spentAmount: Number(budgetLine.spentAmount),
      remainingAmount: Number(budgetLine.remainingAmount),
      available:
        Number(budgetLine.allocatedAmount) - Number(budgetLine.committedAmount),
    };
  }

  async getSummary() {
    const budgetLines = await this.findAll();

    const summary = budgetLines.map((line) => ({
      id: line.id,
      name: line.name,
      category: line.category,
      fiscalYear: line.fiscalYear,
      allocatedAmount: Number(line.allocatedAmount),
      committedAmount: Number(line.committedAmount),
      spentAmount: Number(line.spentAmount),
      remainingAmount: Number(line.remainingAmount),
      available: Number(line.allocatedAmount) - Number(line.committedAmount),
      isActive: line.isActive,
    }));

    const totals = summary.reduce(
      (acc, line) => ({
        totalAllocated: acc.totalAllocated + line.allocatedAmount,
        totalCommitted: acc.totalCommitted + line.committedAmount,
        totalSpent: acc.totalSpent + line.spentAmount,
        totalRemaining: acc.totalRemaining + line.remainingAmount,
      }),
      {
        totalAllocated: 0,
        totalCommitted: 0,
        totalSpent: 0,
        totalRemaining: 0,
      },
    );

    return {
      budgetLines: summary,
      totals,
    };
  }

  async commitFunds(budgetLineId: string, amount: number): Promise<void> {
    const budgetLine = await this.findOne(budgetLineId);

    const newCommittedAmount =
      Number(budgetLine.committedAmount) + Number(amount);

    if (newCommittedAmount > Number(budgetLine.allocatedAmount)) {
      throw new BadRequestException(
        `Insufficient funds. Available: ₦${Number(budgetLine.allocatedAmount) - Number(budgetLine.committedAmount)}, Requested: ₦${amount}`,
      );
    }

    budgetLine.committedAmount = newCommittedAmount;
    await this.budgetLineRepository.save(budgetLine);
  }

  async releaseCommittedFunds(
    budgetLineId: string,
    amount: number,
  ): Promise<void> {
    const budgetLine = await this.findOne(budgetLineId);

    budgetLine.committedAmount =
      Number(budgetLine.committedAmount) - Number(amount);
    await this.budgetLineRepository.save(budgetLine);
  }

  async recordSpending(budgetLineId: string, amount: number): Promise<void> {
    const budgetLine = await this.findOne(budgetLineId);

    budgetLine.spentAmount = Number(budgetLine.spentAmount) + Number(amount);
    budgetLine.remainingAmount =
      Number(budgetLine.allocatedAmount) - Number(budgetLine.spentAmount);

    await this.budgetLineRepository.save(budgetLine);
  }
}
