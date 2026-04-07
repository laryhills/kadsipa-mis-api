import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InterventionEntity } from '../../interventions/entities/intervention.entity';
import { UserEntity } from '../../users/entities/user.entity';

export enum PendingBeneficiarySourceType {
  BULK_UPLOAD = 'BulkUpload',
  MOBILE_SYNC = 'MobileSync',
  MANUAL_ENTRY = 'ManualEntry',
}

export enum PendingBeneficiaryStatus {
  PENDING_REVIEW = 'PendingReview',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  DUPLICATE = 'Duplicate',
}

@Entity('pending_beneficiaries')
export class PendingBeneficiaryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PendingBeneficiarySourceType,
    name: 'source_type',
  })
  sourceType: PendingBeneficiarySourceType;

  @Column({ name: 'source_reference', length: 500 })
  sourceReference: string;

  @Column({ type: 'jsonb', name: 'core_data' })
  coreData: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'custom_data', nullable: true })
  customData: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'validation_errors', default: [] })
  validationErrors: Array<{ field: string; message: string }>;

  @Column({
    type: 'enum',
    enum: PendingBeneficiaryStatus,
    default: PendingBeneficiaryStatus.PENDING_REVIEW,
  })
  status: PendingBeneficiaryStatus;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy: UserEntity;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedById: string;

  @Column({ type: 'timestamp', name: 'reviewed_at', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'text', name: 'review_notes', nullable: true })
  reviewNotes: string;

  @Column({ name: 'approved_beneficiary_id', nullable: true })
  approvedBeneficiaryId: string;

  @Column({ name: 'approved_enrollment_id', nullable: true })
  approvedEnrollmentId: string;

  @Column({ name: 'duplicate_of_beneficiary_id', nullable: true })
  duplicateOfBeneficiaryId: string;

  @ManyToOne(() => InterventionEntity, { nullable: false })
  @JoinColumn({ name: 'intervention_id' })
  intervention: InterventionEntity;

  @Column({ name: 'intervention_id' })
  interventionId: string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: UserEntity;

  @Column({ name: 'uploaded_by' })
  uploadedById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
