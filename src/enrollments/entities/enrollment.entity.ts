import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { InterventionEntity } from '../../interventions/entities/intervention.entity';
import { BeneficiaryEntity } from '../../beneficiaries/entities/beneficiary.entity';
import { UserEntity } from '../../users/entities/user.entity';

export enum EnrollmentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

@Entity('intervention_enrollments')
@Unique(['intervention', 'beneficiary'])
export class EnrollmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => InterventionEntity,
    (intervention) => intervention.enrollments,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'intervention_id' })
  intervention: InterventionEntity;

  @Column({ nullable: false })
  intervention_id: string;

  @ManyToOne(
    () => BeneficiaryEntity,
    (beneficiary) => beneficiary.enrollments,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'beneficiary_id' })
  beneficiary: BeneficiaryEntity;

  @Column({ nullable: false })
  beneficiary_id: string;

  @Column({ type: 'date', nullable: false })
  enrollment_date: Date;

  @Column({ length: 100, nullable: true })
  reason_code: string;

  @Column({ type: 'text', nullable: true })
  reason_text: string;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.PENDING,
  })
  status: EnrollmentStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  allocation_amount: number;

  @Column({ type: 'jsonb', nullable: true, name: 'custom_data' })
  customData: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: UserEntity;

  @Column({ nullable: true })
  created_by: string;
}
