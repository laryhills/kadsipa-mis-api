import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalYearEntity } from './entities/fiscal-year.entity';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';
import { UpdateFiscalYearDto } from './dto/update-fiscal-year.dto';

@Injectable()
export class FiscalYearsService {
  constructor(
    @InjectRepository(FiscalYearEntity)
    private readonly fiscalYearRepository: Repository<FiscalYearEntity>,
  ) {}

  async create(createDto: CreateFiscalYearDto): Promise<FiscalYearEntity> {
    const fiscalYear = this.fiscalYearRepository.create(createDto);
    return this.fiscalYearRepository.save(fiscalYear);
  }

  async findAll(): Promise<FiscalYearEntity[]> {
    return this.fiscalYearRepository.find({
      order: { startDate: 'DESC' },
    });
  }

  async findActive(): Promise<FiscalYearEntity[]> {
    return this.fiscalYearRepository.find({
      where: { isActive: true },
      order: { startDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<FiscalYearEntity> {
    const fiscalYear = await this.fiscalYearRepository.findOne({
      where: { id },
    });

    if (!fiscalYear) {
      throw new NotFoundException(`Fiscal year with ID ${id} not found`);
    }

    return fiscalYear;
  }

  async update(
    id: string,
    updateDto: UpdateFiscalYearDto,
  ): Promise<FiscalYearEntity> {
    const fiscalYear = await this.findOne(id);
    Object.assign(fiscalYear, updateDto);
    return this.fiscalYearRepository.save(fiscalYear);
  }

  async remove(id: string): Promise<void> {
    const fiscalYear = await this.findOne(id);
    await this.fiscalYearRepository.remove(fiscalYear);
  }
}
