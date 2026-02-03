import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum InterventionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity('interventions')
export class InterventionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @Column({ nullable: false, unique: true })
  program_code: string;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  program_type: string;

  @Column({ type: 'decimal', precision: 13, scale: 2, nullable: false })
  budget_allocated: number;

  @Column({ nullable: false })
  funding_source: string;

  @Column({
    type: 'enum',
    enum: InterventionStatus,
    default: InterventionStatus.PENDING,
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
}
