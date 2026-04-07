import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BeneficiaryEntity } from '../../beneficiaries/entities/beneficiary.entity';
import { BudgetLineEntity } from '../../budget-lines/entities/budget-line.entity';
import { InterventionEntity } from '../../interventions/entities/intervention.entity';
import { UserEntity } from '../../users/entities/user.entity';

export enum DisbursementStatus {
  PENDING = 'Pending',
  PROCESSING = 'Processing',
  PAID = 'Paid',
  FAILED = 'Failed',
}

@Entity('disbursements')
export class DisbursementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_number', length: 50 })
  batchNumber: string;

  @ManyToOne(() => InterventionEntity, { nullable: false })
  @JoinColumn({ name: 'intervention_id' })
  intervention: InterventionEntity;

  @ManyToOne(() => BeneficiaryEntity, { nullable: false })
  @JoinColumn({ name: 'beneficiary_id' })
  beneficiary: BeneficiaryEntity;

  @ManyToOne(() => BudgetLineEntity, { nullable: false })
  @JoinColumn({ name: 'budget_line_id' })
  budgetLine: BudgetLineEntity;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  amount: number;

  @Column({
    type: 'enum',
    enum: DisbursementStatus,
    default: DisbursementStatus.PAID,
  })
  status: DisbursementStatus;

  @Column({ name: 'payment_date', type: 'timestamp', nullable: true })
  paymentDate: Date;

  @Column({ name: 'bank_name', length: 100, nullable: true })
  bankName: string;

  @Column({ name: 'account_number', length: 50, nullable: true })
  accountNumber: string;

  @Column({ name: 'reference_number', length: 100, nullable: true })
  referenceNumber: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedBy: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
