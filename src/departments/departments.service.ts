import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepartmentEntity } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(DepartmentEntity)
    private readonly departmentRepository: Repository<DepartmentEntity>,
  ) {}

  async create(createDto: CreateDepartmentDto): Promise<DepartmentEntity> {
    const department = this.departmentRepository.create(createDto);
    return this.departmentRepository.save(department);
  }

  async findAll(): Promise<DepartmentEntity[]> {
    return this.departmentRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findActive(): Promise<DepartmentEntity[]> {
    return this.departmentRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<DepartmentEntity> {
    const department = await this.departmentRepository.findOne({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return department;
  }

  async update(
    id: string,
    updateDto: UpdateDepartmentDto,
  ): Promise<DepartmentEntity> {
    const department = await this.findOne(id);
    Object.assign(department, updateDto);
    return this.departmentRepository.save(department);
  }

  async remove(id: string): Promise<void> {
    const department = await this.findOne(id);
    await this.departmentRepository.remove(department);
  }
}
