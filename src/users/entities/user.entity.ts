import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { hashPassword } from '../../common/utils/hash.util';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, unique: true })
  email: string;

  @Column({ nullable: false })
  password: string;

  @Column({ nullable: false })
  full_name: string;

  @Column({ nullable: false, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ nullable: true })
  mfa_secret: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  last_login_at: Date;

  @Column({ nullable: true })
  deleted_at: Date;

  @OneToMany('UserRoleEntity', 'user')
  userRoles: any[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.password) {
      this.password = await hashPassword(this.password);
    }
  }
}
