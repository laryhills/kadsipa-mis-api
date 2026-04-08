import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { FiscalYearEntity } from '../../fiscal-years/entities/fiscal-year.entity';
import { DepartmentEntity } from '../../departments/entities/department.entity';
import { FundRequestEntity } from '../../fund-requests/entities/fund-request.entity';

export enum BudgetType {
  CAPITAL = 'Capital',
  RECURRENT = 'Recurrent',
}

export enum BudgetLineCategory {
  DIRECT_CASH_TRANSFERS = 'Direct Cash Transfers',
  SKILLS_TRAINING = 'Skills Training Programs',
  AGRICULTURAL = 'Agricultural Support',
  ADMINISTRATIVE = 'Administrative Costs',
  HEALTHCARE = 'Healthcare Services',
  INFRASTRUCTURE = 'Infrastructure Development',
  EMERGENCY_RELIEF = 'Emergency Relief',
  EDUCATION = 'Education Programs',
  LOGISTICS_OPERATIONS = 'Logistics & Operations',
  MONITORING_EVALUATION = 'Monitoring & Evaluation',
  OFFICE_SUPPLIES = 'Office Supplies',
  OTHER = 'Other',
}

@Entity('budget_lines')
export class BudgetLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({
    type: 'enum',
    enum: BudgetType,
  })
  budgetType: BudgetType;

  @Column({
    type: 'enum',
    enum: BudgetLineCategory,
  })
  category: BudgetLineCategory;

  @Column({ name: 'account_code', length: 50, nullable: true })
  accountCode: string;

  @ManyToOne(() => FiscalYearEntity, (fiscalYear) => fiscalYear.budgetLines, {
    nullable: false,
  })
  @JoinColumn({ name: 'fiscal_year_id' })
  fiscalYear: FiscalYearEntity;

  @ManyToOne(() => DepartmentEntity, (department) => department.budgetLines, {
    nullable: false,
  })
  @JoinColumn({ name: 'department_id' })
  department: DepartmentEntity;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'allocated_amount',
    default: 0,
  })
  allocatedAmount: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'committed_amount',
    default: 0,
  })
  committedAmount: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'spent_amount',
    default: 0,
  })
  spentAmount: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'remaining_amount',
    default: 0,
  })
  remainingAmount: number;

  @Column({ type: 'text', nullable: true })
  justification: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: UserEntity;

  @Column({ name: 'created_by' })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => FundRequestEntity, (fundRequest) => fundRequest.budgetLine)
  fundRequests: FundRequestEntity[];
}
