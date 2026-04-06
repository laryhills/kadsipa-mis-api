import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRoleEntity } from './user-role.entity';

export interface RolePermissions {
  userManagement: {
    viewUsers: boolean;
    manageRoles: boolean;
  };
  financialManagement: {
    approveDisbursements: boolean;
    viewBudget: boolean;
    manageBudget: boolean;
  };
  interventionsAndProjects: {
    createIntervention: boolean;
    manageBeneficiaries: boolean;
    viewInterventions: boolean;
    editIntervention: boolean;
  };
  reports: {
    viewReports: boolean;
    generateReports: boolean;
    deleteReports: boolean;
  };
  dataReview: {
    reviewPendingData: boolean;
    approveBeneficiaries: boolean;
    rejectBeneficiaries: boolean;
  };
  auditLogs: {
    viewAuditLogs: boolean;
  };
}

@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  permissions: RolePermissions;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: false, name: 'is_system' })
  isSystem: boolean;

  @OneToMany(() => UserRoleEntity, (userRole: UserRoleEntity) => userRole.role)
  userRoles: UserRoleEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
