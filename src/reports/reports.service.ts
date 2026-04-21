import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { ReportEntity } from './entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { QueryReportsDto } from './dto/query-reports.dto';
import { ReportListSortBy } from './enums/report-list-sort-by.enum';
import type { SortOrder } from '../common/dto/sort-query.dto';
import { ReportDetailsResponseDto } from './dto/report-details-response.dto';
import { ReportStatus } from './enums/report-status.enum';
import type { ReportJobData } from './processors/reports.processor';
import { ReportGeneratorService } from './services/report-generator.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly storageDir = path.join(process.cwd(), 'storage', 'reports');

  constructor(
    @InjectRepository(ReportEntity)
    private readonly reportRepository: Repository<ReportEntity>,
    @InjectQueue('reports')
    private readonly reportsQueue: Queue<ReportJobData>,
    private readonly reportGeneratorService: ReportGeneratorService,
  ) {}

  async create(
    createReportDto: CreateReportDto,
    userId: string,
  ): Promise<ReportEntity> {
    const referenceNumber = await this.generateReferenceNumber();

    const config = {
      ...createReportDto.config,
      includedMetrics: createReportDto.includedMetrics || [],
    };

    const report = this.reportRepository.create({
      name: createReportDto.name,
      interventionId: createReportDto.interventionId,
      reportType: createReportDto.reportType,
      startDate: createReportDto.startDate,
      endDate: createReportDto.endDate,
      fileFormat: createReportDto.fileFormat,
      config,
      referenceNumber,
      generatedById: userId,
      status: ReportStatus.DRAFT,
    });

    const savedReport = await this.reportRepository.save(report);

    if (createReportDto.shouldFinalize) {
      await this.finaliseReport(savedReport.id, userId);
      return await this.findOne(savedReport.id);
    }

    return savedReport;
  }

  async findAll(query: QueryReportsDto): Promise<{
    data: ReportEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      search,
      interventionId,
      reportType,
      status,
      periodStart,
      periodEnd,
    } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy: ReportListSortBy = query.sortBy ?? ReportListSortBy.createdAt;
    const sortOrder: SortOrder = query.sortOrder ?? 'DESC';

    const qb = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.intervention', 'intervention')
      .innerJoin('report.generatedBy', 'generatedBy')
      .addSelect([
        'generatedBy.id',
        'generatedBy.email',
        'generatedBy.full_name',
      ]);

    if (search) {
      qb.andWhere('report.name ILIKE :search', { search: `%${search}%` });
    }

    if (interventionId) {
      qb.andWhere('report.interventionId = :interventionId', {
        interventionId,
      });
    }

    if (reportType) {
      qb.andWhere('report.reportType = :reportType', { reportType });
    }

    if (status) {
      qb.andWhere('report.status = :status', { status });
    }

    if (periodStart && periodEnd) {
      qb.andWhere(
        'report.startDate <= :periodEnd AND report.endDate >= :periodStart',
        { periodStart, periodEnd },
      );
    }

    switch (sortBy) {
      case ReportListSortBy.name:
        qb.orderBy('report.name', sortOrder);
        break;
      case ReportListSortBy.intervention:
        qb.orderBy('intervention.name', sortOrder, 'NULLS LAST');
        break;
      case ReportListSortBy.createdAt:
        qb.orderBy('report.createdAt', sortOrder);
        break;
      case ReportListSortBy.status:
        qb.orderBy('report.status', sortOrder);
        break;
      default:
        qb.orderBy('report.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<ReportEntity> {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['intervention', 'generatedBy'],
      select: {
        generatedBy: {
          id: true,
          email: true,
          full_name: true,
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    return report;
  }

  async update(
    id: string,
    updateReportDto: UpdateReportDto,
  ): Promise<ReportEntity> {
    const report = await this.findOne(id);

    if (report.status === ReportStatus.FINALISED) {
      throw new ForbiddenException(
        'Cannot modify a finalised report. Finalised reports are cryptographically signed and frozen. Please create a new report or regenerate this one.',
      );
    }

    if (report.status === ReportStatus.PROCESSING) {
      throw new BadRequestException(
        'Cannot update a report that is currently being processed',
      );
    }

    Object.assign(report, updateReportDto);
    return await this.reportRepository.save(report);
  }

  async finaliseReport(id: string, userId: string): Promise<ReportEntity> {
    const report = await this.findOne(id);

    if (report.status === ReportStatus.FINALISED) {
      throw new BadRequestException(
        'Report is already finalised and cryptographically signed',
      );
    }

    if (report.status === ReportStatus.PROCESSING) {
      throw new BadRequestException('Report is currently being processed');
    }

    const signature = this.generateReportSignature(report);

    await this.reportRepository.update(id, {
      status: ReportStatus.PROCESSING,
      signature,
    });

    await this.reportsQueue.add(
      'generate-report',
      { reportId: id, userId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    this.logger.log(
      `Queued report generation for report ${id} with signature ${signature.substring(0, 16)}...`,
    );

    return await this.findOne(id);
  }

  private generateReportSignature(report: ReportEntity): string {
    const dataToSign = JSON.stringify({
      referenceNumber: report.referenceNumber,
      name: report.name,
      reportType: report.reportType,
      interventionId: report.interventionId,
      startDate: report.startDate,
      endDate: report.endDate,
      config: report.config,
      generatedById: report.generatedById,
      timestamp: new Date().toISOString(),
    });

    return crypto.createHash('sha256').update(dataToSign).digest('hex');
  }

  async regenerate(id: string, userId: string): Promise<ReportEntity> {
    const report = await this.findOne(id);

    if (report.pdfUrl) {
      const pdfPath = path.join(this.storageDir, report.pdfUrl);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }

    if (report.excelUrl) {
      const excelPath = path.join(this.storageDir, report.excelUrl);
      if (fs.existsSync(excelPath)) {
        fs.unlinkSync(excelPath);
      }
    }

    await this.reportRepository.update(id, {
      status: ReportStatus.PROCESSING,
      pdfUrl: null,
      excelUrl: null,
      generatedAt: null,
      errorMessage: null,
    });

    await this.reportsQueue.add(
      'generate-report',
      { reportId: id, userId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    this.logger.log(`Queued report regeneration for report ${id}`);

    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const report = await this.findOne(id);

    if (report.pdfUrl) {
      const pdfPath = path.join(this.storageDir, report.pdfUrl);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }

    if (report.excelUrl) {
      const excelPath = path.join(this.storageDir, report.excelUrl);
      if (fs.existsSync(excelPath)) {
        fs.unlinkSync(excelPath);
      }
    }

    await this.reportRepository.delete(id);
    this.logger.log(`Deleted report ${id}`);
  }

  async downloadFile(id: string, format: 'pdf' | 'excel'): Promise<string> {
    const report = await this.findOne(id);

    if (report.status !== ReportStatus.FINALISED) {
      throw new BadRequestException('Report is not finalised yet');
    }

    const fileName = format === 'pdf' ? report.pdfUrl : report.excelUrl;

    if (!fileName) {
      throw new NotFoundException(
        `${format.toUpperCase()} file not found for this report`,
      );
    }

    const filePath = path.join(this.storageDir, fileName);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`File not found on server`);
    }

    return filePath;
  }

  async getReportDetails(id: string): Promise<ReportDetailsResponseDto> {
    const report = await this.findOne(id);

    const reportData =
      await this.reportGeneratorService.getReportDataByType(report);

    const metadata = {
      id: report.id,
      referenceNumber: report.referenceNumber,
      name: report.name,
      reportType: report.reportType,
      status: report.status,
      startDate: report.startDate,
      endDate: report.endDate,
      generatedAt: report.generatedAt,
      generatedBy: report.generatedBy
        ? {
            id: report.generatedBy.id,
            name: report.generatedBy.full_name,
            email: report.generatedBy.email,
          }
        : null,
      intervention: report.intervention
        ? {
            id: report.intervention.id,
            name: report.intervention.name,
          }
        : null,
    };

    return {
      metadata,
      data: reportData as ReportDetailsResponseDto['data'],
    };
  }

  private async generateReferenceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.reportRepository.count({
      where: {
        referenceNumber: ILike(`RPT-${year}-%`),
      },
    });

    const nextNumber = (count + 1).toString().padStart(3, '0');
    return `RPT-${year}-${nextNumber}`;
  }
}
