import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EnrollmentEntity } from '../../enrollments/entities/enrollment.entity';
import { LgaEntity } from '../../lgas/entities/lga.entity';
import { FundRequestEntity } from '../../fund-requests/entities/fund-request.entity';

export enum InterventionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  SUSPENDED = 'suspended',
}

export enum FundingSource {
  FEDERAL = 'Federal',
  STATE_GOVERNMENT = 'State Government',
  NGO = 'NGO',
  INTERNATIONAL_DONOR = 'International Donor',
  PRIVATE_SECTOR = 'Private Sector',
}

export enum InterventionType {
  CASH_TRANSFER = 'Cash Transfer',
  FOOD_AID = 'Food Aid',
  SKILLS_TRAINING = 'Skills Training',
  HEALTHCARE_SUPPORT = 'Healthcare Support',
  EDUCATION_SUPPORT = 'Education Support',
  AGRICULTURAL = 'Agricultural',
  INFRASTRUCTURE = 'Infrastructure',
  OTHER = 'Other',
}

export enum ReportFrequency {
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly',
  QUARTERLY = 'Quarterly',
  ANNUALLY = 'Annually',
}

@Entity('interventions')
export class InterventionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, unique: true })
  program_code: string;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  program_type: string;

  @Column({
    type: 'enum',
    enum: InterventionType,
    name: 'intervention_type',
    nullable: true,
  })
  interventionType: InterventionType;

  @Column({
    type: 'enum',
    enum: FundingSource,
    name: 'funding_source',
    nullable: false,
  })
  fundingSource: FundingSource;

  @Column({
    type: 'enum',
    enum: ReportFrequency,
    name: 'report_frequency',
    nullable: true,
  })
  reportFrequency: ReportFrequency;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  budget_allocated: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'budget_received',
    default: 0,
  })
  budgetReceived: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'budget_spent',
    default: 0,
  })
  budgetSpent: number;

  @Column({ type: 'jsonb', nullable: true, name: 'form_schema' })
  formSchema: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: InterventionStatus,
    default: InterventionStatus.DRAFT,
  })
  status: InterventionStatus;

  @Column({ nullable: false })
  start_date: Date;

  @Column({ nullable: false })
  end_date: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date;

  @OneToMany(() => EnrollmentEntity, (enrollment) => enrollment.intervention)
  enrollments: EnrollmentEntity[];

  @OneToMany(() => FundRequestEntity, (fundRequest) => fundRequest.intervention)
  fundRequests: FundRequestEntity[];

  @ManyToMany(() => LgaEntity, (lga) => lga.interventions)
  @JoinTable({
    name: 'intervention_lgas',
    joinColumn: { name: 'intervention_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'lga_id', referencedColumnName: 'id' },
  })
  lgas: LgaEntity[];
}
