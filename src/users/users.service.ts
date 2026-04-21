import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UserEntity, UserStatus } from '../users/entities/user.entity';
import { UserRoleEntity } from '../roles/entities/user-role.entity';
import type { RolePermissions } from '../roles/entities/role.entity';
import { IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UUID_REGEX } from '../common/constants';
import * as crypto from 'crypto';
import { comparePassword } from '../common/utils/hash.util';
import { RolesService } from '@/roles/roles.service';
import { MailService } from '../mail/mail.service';
import { QueryUsersDto, UserListSortBy } from './dto/query-users.dto';

export type UserListItem = {
  id: string;
  email: string;
  full_name: string;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  roles: { id: string; name: string }[];
};

export type UserPublicDetail = {
  id: string;
  email: string;
  full_name: string;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    private readonly rolesService: RolesService,
    private readonly mailService: MailService,
  ) {}

  async findActiveAuthUserById(id: string): Promise<UserEntity | null> {
    if (!UUID_REGEX.test(id)) {
      return null;
    }
    return await this.userRepository.findOne({
      where: { id, deleted_at: IsNull() },
    });
  }

  async create(
    createUserDto: CreateUserDto,
  ): Promise<
    Pick<
      UserEntity,
      'id' | 'email' | 'full_name' | 'status' | 'created_at' | 'updated_at'
    >
  > {
    const existing = await this.userRepository.findOne({
      where: { email: createUserDto.email, deleted_at: IsNull() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const user = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(user);
    return {
      id: savedUser.id,
      email: savedUser.email,
      full_name: savedUser.full_name,
      status: savedUser.status,
      created_at: savedUser.created_at,
      updated_at: savedUser.updated_at,
    };
  }

  async inviteUser(
    inviteUserDto: InviteUserDto,
    invitedBy: string,
  ): Promise<{
    user: Pick<
      UserEntity,
      'id' | 'email' | 'full_name' | 'status' | 'created_at'
    >;
    temporaryPassword: string;
  }> {
    const existing = await this.userRepository.findOne({
      where: { email: inviteUserDto.email, deleted_at: IsNull() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    if (inviteUserDto.roleIds && inviteUserDto.roleIds.length > 0) {
      await this.rolesService.checkRoleIdsAreValid(inviteUserDto.roleIds);
    }

    const temporaryPassword = crypto
      .randomBytes(12)
      .toString('base64')
      .slice(0, 16);

    const user = this.userRepository.create({
      email: inviteUserDto.email,
      full_name: inviteUserDto.full_name,
      password: temporaryPassword,
      status: UserStatus.PENDING,
    });
    const savedUser = await this.userRepository.save(user);

    if (inviteUserDto.roleIds && inviteUserDto.roleIds.length > 0) {
      for (const roleId of inviteUserDto.roleIds) {
        await this.assignRole(savedUser.id, roleId, invitedBy);
      }
    }

    await this.mailService.sendUserInvitation(
      savedUser.email,
      savedUser.full_name,
      temporaryPassword,
      inviteUserDto.personalMessage,
    );

    return {
      user: {
        id: savedUser.id,
        email: savedUser.email,
        full_name: savedUser.full_name,
        status: savedUser.status,
        created_at: savedUser.created_at,
      },
      temporaryPassword,
    };
  }

  async findAll(query: QueryUsersDto = {}): Promise<UserListItem[]> {
    const sortBy = query.sortBy ?? UserListSortBy.name;
    const sortOrder = query.sortOrder ?? 'ASC';

    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('u.deleted_at IS NULL')
      .leftJoinAndSelect('u.userRoles', 'ur')
      .leftJoinAndSelect('ur.role', 'r');

    switch (sortBy) {
      case UserListSortBy.name:
        qb.orderBy('u.full_name', sortOrder);
        break;
      case UserListSortBy.status:
        qb.orderBy('u.status', sortOrder);
        break;
      case UserListSortBy.lastActive:
        qb.orderBy('u.last_login_at', sortOrder, 'NULLS LAST');
        break;
      case UserListSortBy.role:
        qb.addSelect(
          `(SELECT r2.name FROM user_roles ur2 INNER JOIN roles r2 ON r2.id = ur2.role_id WHERE ur2.user_id = u.id ORDER BY ur2.assigned_at ASC LIMIT 1)`,
          'first_role_name',
        );
        qb.orderBy('first_role_name', sortOrder, 'NULLS LAST');
        break;
      default:
        qb.orderBy('u.full_name', 'ASC');
    }

    const users = await qb.getMany();

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      status: u.status,
      created_at: u.created_at,
      updated_at: u.updated_at,
      last_login_at: u.last_login_at ?? null,
      roles:
        (u.userRoles as UserRoleEntity[] | undefined)?.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
        })) ?? [],
    }));
  }

  async findOneByEmail(email: string): Promise<UserEntity | null> {
    return await this.userRepository.findOne({
      where: { email, deleted_at: IsNull() },
    });
  }

  async findOne(id: string): Promise<UserEntity> {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid user ID');
    }
    const user = await this.userRepository.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findOnePublicDetail(id: string): Promise<UserPublicDetail> {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid user ID');
    }
    const row = await this.userRepository
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.email',
        'u.full_name',
        'u.status',
        'u.created_at',
        'u.updated_at',
        'u.last_login_at',
      ])
      .where('u.id = :id', { id })
      .andWhere('u.deleted_at IS NULL')
      .getOne();

    if (!row) {
      throw new NotFoundException('User not found');
    }

    return {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_login_at: row.last_login_at ?? null,
    };
  }

  async resetPendingUserInvite(
    userId: string,
    requestedBy: string,
    personalMessage?: string,
  ): Promise<void> {
    if (userId === requestedBy) {
      throw new BadRequestException('You cannot reset your own invitation.');
    }
    if (!UUID_REGEX.test(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    const user = await this.findOne(userId);
    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException(
        'Only users who have not completed signup can have their invite reset.',
      );
    }

    const temporaryPassword = crypto
      .randomBytes(12)
      .toString('base64')
      .slice(0, 16);

    user.password = temporaryPassword;
    await this.userRepository.save(user);

    await this.mailService.sendUserInvitation(
      user.email,
      user.full_name,
      temporaryPassword,
      personalMessage,
    );
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Pick<UserEntity, 'id' | 'email' | 'full_name' | 'status'>> {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid user ID');
    }
    await this.findOne(id);
    await this.userRepository.update(id, updateUserDto);
    const updatedUser = await this.userRepository.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      full_name: updatedUser.full_name,
      status: updatedUser.status,
    };
  }

  async updateLastLoginAt(id: string): Promise<void> {
    await this.userRepository.update(id, { last_login_at: new Date() });
  }

  async remove(id: string): Promise<void> {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid user ID');
    }
    await this.findOne(id);
    await this.userRepository.update(id, { deleted_at: new Date() });
  }

  async assignRole(
    userId: string,
    roleId: string,
    assignedBy: string,
  ): Promise<UserRoleEntity> {
    if (userId === assignedBy) {
      throw new BadRequestException('Users cannot assign roles to themselves');
    }

    await this.findOne(userId);

    const existing = await this.userRoleRepository.findOne({
      where: { userId, roleId },
    });

    if (existing) {
      throw new ConflictException('User already has this role');
    }

    const userRole = this.userRoleRepository.create({
      userId,
      roleId,
      assignedBy,
    });

    return await this.userRoleRepository.save(userRole);
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    await this.findOne(userId);

    const userRole = await this.userRoleRepository.findOne({
      where: { userId, roleId },
    });

    if (!userRole) {
      throw new NotFoundException('User role assignment not found');
    }

    await this.userRoleRepository.remove(userRole);
  }

  async getUserRoles(userId: string): Promise<UserRoleEntity[]> {
    return await this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
    });
  }

  async getUserWithRolesAndPermissions(userId: string): Promise<{
    id: string;
    email: string;
    full_name: string;
    status: UserStatus;
    requirePasswordChange: boolean;
    roles: Array<{
      id: string;
      name: string;
      permissions: RolePermissions;
    }>;
    allPermissions: RolePermissions;
  }> {
    const user = await this.findOne(userId);

    const userRoles = await this.getUserRoles(userId);

    const roles = userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      permissions: ur.role.permissions,
    }));

    const allPermissions = this.mergePermissions(
      userRoles.map((ur) => ur.role.permissions),
    );

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      status: user.status,
      requirePasswordChange: user.status === UserStatus.PENDING,
      roles,
      allPermissions,
    };
  }

  private mergePermissions(
    permissionsArray: RolePermissions[],
  ): RolePermissions {
    const merged: Record<string, Record<string, boolean>> = {};

    for (const permissions of permissionsArray) {
      for (const category of Object.keys(permissions) as Array<
        keyof RolePermissions
      >) {
        if (!merged[category]) {
          merged[category] = {};
        }
        const actions = permissions[category];
        const mergedCategory = merged[category];
        const actionsRecord = actions as unknown as Record<string, boolean>;

        for (const action of Object.keys(actionsRecord)) {
          mergedCategory[action] =
            mergedCategory[action] || actionsRecord[action];
        }
      }
    }

    return merged as unknown as RolePermissions;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findOne(userId);

    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const isSamePassword = await comparePassword(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    user.password = newPassword;

    if (user.status === UserStatus.PENDING) {
      user.status = UserStatus.ACTIVE;
    }

    await this.userRepository.save(user);
  }
}
