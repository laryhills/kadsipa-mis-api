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
import { InterventionEntity } from '../../interventions/entities/intervention.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { FundRequestEntity } from '../../fund-requests/entities/fund-request.entity';

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

  @Column({ name: 'intervention_id' })
  interventionId: string;

  @ManyToOne(() => BeneficiaryEntity, { nullable: false })
  @JoinColumn({ name: 'beneficiary_id' })
  beneficiary: BeneficiaryEntity;

  @Column({ name: 'beneficiary_id' })
  beneficiaryId: string;

  @ManyToOne(() => FundRequestEntity, { nullable: true })
  @JoinColumn({ name: 'fund_request_id' })
  fundRequest: FundRequestEntity;

  @Column({ name: 'fund_request_id', nullable: true })
  fundRequestId: string;

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

  @Column({ name: 'approved_by', nullable: true })
  approvedById: string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: UserEntity;

  @Column({ name: 'created_by' })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
