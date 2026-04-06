import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RoleEntity } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<RoleEntity> {
    const existingRole = await this.roleRepository.findOne({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException(
        `Role with name "${createRoleDto.name}" already exists`,
      );
    }

    const role = this.roleRepository.create({
      ...createRoleDto,
      isSystem: false,
    });

    return this.roleRepository.save(role);
  }

  async findAll(): Promise<RoleEntity[]> {
    return this.roleRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({ where: { id } });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    return role;
  }

  async findByName(name: string): Promise<RoleEntity | null> {
    return this.roleRepository.findOne({ where: { name } });
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<RoleEntity> {
    const role = await this.findOne(id);

    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: updateRoleDto.name },
      });

      if (existingRole) {
        throw new ConflictException(
          `Role with name "${updateRoleDto.name}" already exists`,
        );
      }
    }

    Object.assign(role, updateRoleDto);
    return this.roleRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    const userCount = await this.roleRepository
      .createQueryBuilder('role')
      .leftJoin('role.userRoles', 'userRole')
      .where('role.id = :id', { id })
      .getCount();

    if (userCount > 0) {
      throw new BadRequestException(
        'Cannot delete role that is assigned to users. Please reassign users first.',
      );
    }

    await this.roleRepository.remove(role);
  }

  async getUserRoles(userId: string): Promise<RoleEntity[]> {
    return this.roleRepository
      .createQueryBuilder('role')
      .innerJoin('role.userRoles', 'userRole')
      .where('userRole.userId = :userId', { userId })
      .andWhere('role.isActive = :isActive', { isActive: true })
      .getMany();
  }

  async checkRoleIdsAreValid(rolesIds: string[]): Promise<boolean> {
    const roles = await this.roleRepository.find({
      where: { id: In(rolesIds) },
    });
    if (roles.length !== rolesIds.length) {
      throw new BadRequestException('Invalid role IDs');
    }
    return true;
  }
}
