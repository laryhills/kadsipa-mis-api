import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '@/users/entities/user.entity';
import { AuditAction, AuditStatus } from '../constants/audit-action.enum';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  user_id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  action: AuditAction;

  @Column({ type: 'varchar', length: 100, nullable: true })
  resource_type: string;

  @Column({ type: 'uuid', nullable: true })
  resource_id: string;

  @Column({ type: 'jsonb', nullable: true })
  old_values: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  new_values: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  changes_diff: Record<string, any> | null;

  @Column({ type: 'inet', nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: AuditStatus.SUCCESS,
  })
  status: AuditStatus;

  @CreateDateColumn()
  created_at: Date;
}
