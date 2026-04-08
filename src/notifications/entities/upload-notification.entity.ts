import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InterventionEntity } from '../../interventions/entities/intervention.entity';
import { UserEntity } from '../../users/entities/user.entity';

export enum NotificationType {
  UPLOAD_STARTED = 'UploadStarted',
  UPLOAD_COMPLETED = 'UploadCompleted',
  UPLOAD_FAILED = 'UploadFailed',
  RECORDS_APPROVED = 'RecordsApproved',
  RECORDS_REJECTED = 'RecordsRejected',
}

export enum NotificationStatus {
  UNREAD = 'Unread',
  READ = 'Read',
}

@Entity('upload_notifications')
export class UploadNotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InterventionEntity, { nullable: false })
  @JoinColumn({ name: 'intervention_id' })
  intervention: InterventionEntity;

  @Column({ name: 'intervention_id' })
  interventionId: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ name: 'source_file', length: 500, nullable: true })
  sourceFile: string;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD,
  })
  status: NotificationStatus;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: UserEntity;

  @Column({ name: 'created_by' })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
