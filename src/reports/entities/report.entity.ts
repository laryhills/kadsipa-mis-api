import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { InterventionEntity } from '../../interventions/entities/intervention.entity';
import type { UserEntity } from '../../users/entities/user.entity';
import { ReportType } from '../enums/report-type.enum';
import { ReportStatus } from '../enums/report-status.enum';
import { FileFormat } from '../enums/file-format.enum';

@Entity('reports')
export class ReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  referenceNumber: string;

  @Column({ length: 255 })
  name: string;

  @ManyToOne('InterventionEntity', { nullable: true })
  @JoinColumn({ name: 'intervention_id' })
  intervention: InterventionEntity;

  @Column({ name: 'intervention_id', nullable: true })
  interventionId: string | null;

  @Column({
    type: 'enum',
    enum: ReportType,
    default: ReportType.CUSTOM,
  })
  reportType: ReportType;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.DRAFT,
  })
  status: ReportStatus;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, unknown>;

  @Column({ type: 'date', nullable: false })
  startDate: Date;

  @Column({ type: 'date', nullable: false })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: FileFormat,
    default: FileFormat.PDF,
  })
  fileFormat: FileFormat;

  @Column({ type: 'text', nullable: true })
  pdfUrl: string | null;

  @Column({ type: 'text', nullable: true })
  excelUrl: string | null;

  @ManyToOne('UserEntity', { nullable: false })
  @JoinColumn({ name: 'generated_by' })
  generatedBy: UserEntity;

  @Column({ name: 'generated_by' })
  generatedById: string;

  @Column({ type: 'timestamp', nullable: true })
  generatedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'text', nullable: true })
  signature: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
