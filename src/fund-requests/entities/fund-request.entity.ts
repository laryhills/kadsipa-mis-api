import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BudgetLineEntity } from '../../budget-lines/entities/budget-line.entity';
import { InterventionEntity } from '../../interventions/entities/intervention.entity';
import { UserEntity } from '../../users/entities/user.entity';

export enum FundRequestStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  RELEASED = 'Released',
}

@Entity('fund_requests')
export class FundRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @ManyToOne(() => BudgetLineEntity, { nullable: false })
  @JoinColumn({ name: 'budget_line_id' })
  budgetLine: BudgetLineEntity;

  @Column({ name: 'budget_line_id' })
  budgetLineId: string;

  @ManyToOne(() => InterventionEntity, { nullable: true })
  @JoinColumn({ name: 'intervention_id' })
  intervention: InterventionEntity;

  @Column({ name: 'intervention_id', nullable: true })
  interventionId: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'requested_amount',
  })
  requestedAmount: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'approved_amount',
    nullable: true,
  })
  approvedAmount: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'spent_amount',
    default: 0,
  })
  spentAmount: number;

  @Column({
    type: 'enum',
    enum: FundRequestStatus,
    default: FundRequestStatus.PENDING,
  })
  status: FundRequestStatus;

  @Column({ type: 'text' })
  justification: string;

  @Column({ name: 'supporting_documents', type: 'jsonb', nullable: true })
  supportingDocuments: string[];

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'requested_by' })
  requestedBy: UserEntity;

  @Column({ name: 'requested_by' })
  requestedById: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedBy: UserEntity;

  @Column({ name: 'approved_by', nullable: true })
  approvedById: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
