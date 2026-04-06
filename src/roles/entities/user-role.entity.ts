import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RoleEntity } from './role.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('user_roles')
export class UserRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'role_id' })
  roleId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => RoleEntity, (role) => role.userRoles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;

  @Column({ name: 'assigned_by', nullable: true })
  assignedBy: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assignedByUser: UserEntity;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}
