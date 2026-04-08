import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportEntity } from '../entities/report.entity';
import { ReportStatus } from '../enums/report-status.enum';
import { FileFormat } from '../enums/file-format.enum';
import { ReportGeneratorService } from '../services/report-generator.service';

export interface ReportJobData {
  reportId: string;
  userId: string;
}

@Processor('reports')
@Injectable()
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  constructor(
    @InjectRepository(ReportEntity)
    private readonly reportRepository: Repository<ReportEntity>,
    private readonly reportGeneratorService: ReportGeneratorService,
  ) {
    super();
  }

  async process(job: Job<ReportJobData>): Promise<void> {
    const { reportId } = job.data;

    this.logger.log(`Processing report generation for report ID: ${reportId}`);

    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['intervention', 'generatedBy'],
    });

    if (!report) {
      throw new Error(`Report with ID ${reportId} not found`);
    }

    try {
      await this.reportRepository.update(report.id, {
        status: ReportStatus.PROCESSING,
      });

      let pdfUrl: string | null = null;
      let excelUrl: string | null = null;

      if (
        report.fileFormat === FileFormat.PDF ||
        report.fileFormat === FileFormat.BOTH
      ) {
        this.logger.log(`Generating PDF for report ${reportId}`);
        pdfUrl = await this.reportGeneratorService.generatePdf(report);
      }

      if (
        report.fileFormat === FileFormat.EXCEL ||
        report.fileFormat === FileFormat.BOTH
      ) {
        this.logger.log(`Generating Excel for report ${reportId}`);
        excelUrl = await this.reportGeneratorService.generateExcel(report);
      }

      await this.reportRepository.update(report.id, {
        status: ReportStatus.FINALISED,
        pdfUrl,
        excelUrl,
        generatedAt: new Date(),
        errorMessage: null,
      });

      this.logger.log(`Successfully generated report ${reportId}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate report ${reportId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.reportRepository.update(report.id, {
        status: ReportStatus.FAILED,
        errorMessage:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });

      throw error;
    }
  }
}
