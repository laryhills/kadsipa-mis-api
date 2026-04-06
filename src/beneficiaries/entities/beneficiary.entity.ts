import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { EnrollmentEntity } from '../../enrollments/entities/enrollment.entity';

export enum BeneficiaryType {
  INDIVIDUAL = 'individual',
  HOUSEHOLD = 'household',
}

export enum BeneficiaryStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other',
}

@Entity('beneficiaries')
export class BeneficiaryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 12, nullable: false })
  nidhh: string;

  @Column({ length: 255, nullable: false })
  legacy_id: string;

  @Column({
    type: 'enum',
    enum: BeneficiaryType,
    nullable: false,
  })
  beneficiary_type: BeneficiaryType;

  @Column({ length: 255, nullable: false })
  first_name: string;

  @Column({ length: 255, nullable: false })
  last_name: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender: Gender;

  @Column({ default: false, name: 'has_disability' })
  hasDisability: boolean;

  @Column({ length: 100, nullable: true, name: 'disability_type' })
  disabilityType: string;

  @Column({ length: 20, nullable: false })
  nin: string;

  @Column({ length: 20, nullable: true })
  bvn: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone_number: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  lga: string;

  @Column({ length: 100, nullable: true })
  ward: string;

  @Column({ length: 255, nullable: false })
  community: string;

  @Column({
    type: 'enum',
    enum: BeneficiaryStatus,
    default: BeneficiaryStatus.PENDING,
  })
  status: BeneficiaryStatus;

  @Column({ length: 10, nullable: false })
  account_number: string;

  @Column({ length: 255, nullable: false })
  bank: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: UserEntity;

  @Column({ nullable: true })
  created_by: string;

  @Column({ nullable: true })
  deleted_at: Date;

  @OneToMany(() => EnrollmentEntity, (enrollment) => enrollment.beneficiary)
  enrollments: EnrollmentEntity[];
}
