import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  type FindOptionsWhere,
} from 'typeorm';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { ReportEntity } from '../entities/report.entity';
import { ReportType } from '../enums/report-type.enum';
import { InterventionEntity } from '../../interventions/entities/intervention.entity';
import { BeneficiaryEntity } from '../../beneficiaries/entities/beneficiary.entity';
import {
  DisbursementEntity,
  DisbursementStatus,
} from '../../disbursements/entities/disbursement.entity';
import { BudgetLineEntity } from '../../budget-lines/entities/budget-line.entity';
import {
  EnrollmentEntity,
  EnrollmentStatus,
} from '../../enrollments/entities/enrollment.entity';

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);
  private readonly storageDir = path.join(process.cwd(), 'storage', 'reports');

  constructor(
    @InjectRepository(InterventionEntity)
    private readonly interventionRepository: Repository<InterventionEntity>,
    @InjectRepository(BeneficiaryEntity)
    private readonly beneficiaryRepository: Repository<BeneficiaryEntity>,
    @InjectRepository(DisbursementEntity)
    private readonly disbursementRepository: Repository<DisbursementEntity>,
    @InjectRepository(BudgetLineEntity)
    private readonly budgetLineRepository: Repository<BudgetLineEntity>,
    @InjectRepository(EnrollmentEntity)
    private readonly enrollmentRepository: Repository<EnrollmentEntity>,
  ) {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async generatePdf(report: ReportEntity): Promise<string> {
    const fileName = `${report.referenceNumber}.pdf`;
    const filePath = path.join(this.storageDir, fileName);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    switch (report.reportType) {
      case ReportType.EXECUTIVE_SUMMARY:
        await this.generateExecutiveSummaryPdf(doc, report);
        break;
      case ReportType.FINANCIAL_DISBURSEMENT:
        await this.generateFinancialDisbursementPdf(doc, report);
        break;
      case ReportType.BENEFICIARY_LIST:
        await this.generateBeneficiaryListPdf(doc, report);
        break;
      case ReportType.BUDGET_LINE_REPORT:
        await this.generateBudgetLineReportPdf(doc, report);
        break;
      case ReportType.INTERVENTION_SUMMARY:
        await this.generateInterventionSummaryPdf(doc, report);
        break;
      default:
        await this.generateCustomReportPdf(doc, report);
    }

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => resolve(fileName));
      writeStream.on('error', reject);
    });
  }

  async generateExcel(report: ReportEntity): Promise<string> {
    const fileName = `${report.referenceNumber}.xlsx`;
    const filePath = path.join(this.storageDir, fileName);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = report.generatedBy?.full_name || 'System';
    workbook.created = new Date();

    switch (report.reportType) {
      case ReportType.EXECUTIVE_SUMMARY:
        await this.generateExecutiveSummaryExcel(workbook, report);
        break;
      case ReportType.FINANCIAL_DISBURSEMENT:
        await this.generateFinancialDisbursementExcel(workbook, report);
        break;
      case ReportType.BENEFICIARY_LIST:
        await this.generateBeneficiaryListExcel(workbook, report);
        break;
      case ReportType.BUDGET_LINE_REPORT:
        await this.generateBudgetLineReportExcel(workbook, report);
        break;
      case ReportType.INTERVENTION_SUMMARY:
        await this.generateInterventionSummaryExcel(workbook, report);
        break;
      default:
        await this.generateCustomReportExcel(workbook, report);
    }

    await workbook.xlsx.writeFile(filePath);
    return fileName;
  }

  async getReportDataByType(report: ReportEntity): Promise<unknown> {
    switch (report.reportType) {
      case ReportType.EXECUTIVE_SUMMARY:
        return await this.fetchExecutiveSummaryData(report);
      case ReportType.FINANCIAL_DISBURSEMENT:
        return await this.fetchFinancialDisbursementData(report);
      case ReportType.BENEFICIARY_LIST:
        return await this.fetchBeneficiaryListData(report);
      case ReportType.BUDGET_LINE_REPORT:
        return await this.fetchBudgetLineData(report);
      case ReportType.INTERVENTION_SUMMARY:
        return await this.fetchInterventionSummaryData(report);
      default:
        return null;
    }
  }

  private async generateExecutiveSummaryPdf(
    doc: typeof PDFDocument,
    report: ReportEntity,
  ): Promise<void> {
    const data = await this.fetchExecutiveSummaryData(report);

    doc.fontSize(20).text('Executive Summary', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Report: ${report.name}`);
    doc.text(`Reference: ${report.referenceNumber}`);
    doc.text(
      `Period: ${String(report.startDate)} to ${String(report.endDate)}`,
    );
    doc.text(`Generated: ${new Date().toLocaleDateString()}`);
    doc.moveDown(2);

    doc.fontSize(14).text('Key Metrics', { underline: true });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(
      `Total Budget Allocated: N${data.totalBudgetAllocated.toLocaleString()}`,
    );
    doc.text(`Total Disbursed: N${data.totalDisbursed.toLocaleString()}`);
    doc.text(`Budget Utilization: ${data.utilizationRate}%`);
    doc.text(
      `Beneficiaries Reached: ${data.totalBeneficiaries.toLocaleString()}`,
    );
    doc.text(
      `Pending Verification: ${data.pendingVerification.toLocaleString()}`,
    );
    doc.moveDown(2);

    doc.fontSize(14).text('Fund Utilization Analysis', { underline: true });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(`Budget Received vs Allocated: ${data.receivedVsAllocatedRate}%`);
    doc.text(`Spent vs Received: ${data.spentVsReceivedRate}%`);
    doc.moveDown(2);

    if (data.topLgas.length > 0) {
      doc.fontSize(14).text('Top LGAs by Disbursal', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      data.topLgas.forEach((lga, index) => {
        doc.text(
          `${index + 1}. ${lga?.name?.toUpperCase() || 'N/A'}: N${lga.totalAmount.toLocaleString()} (${lga.beneficiaryCount} beneficiaries)`,
        );
      });
      doc.moveDown(2);
    }

    if (data.recentDisbursements.length > 0) {
      doc.addPage();
      doc.fontSize(14).text('Recent Disbursement Log', { underline: true });
      doc.moveDown();
      doc.fontSize(9);

      const tableTop = doc.y;
      const col1X = 50;
      const col2X = 200;
      const col3X = 350;
      const col4X = 450;

      doc.text('Beneficiary', col1X, tableTop);
      doc.text('NIN', col2X, tableTop);
      doc.text('Amount', col3X, tableTop);
      doc.text('Status', col4X, tableTop);

      let yPos = tableTop + 20;
      data.recentDisbursements.forEach((disbursement) => {
        doc.text(disbursement.beneficiaryName, col1X, yPos);
        doc.text(disbursement.nin, col2X, yPos);
        doc.text(`N${disbursement.amount.toLocaleString()}`, col3X, yPos);
        doc.text(disbursement.status, col4X, yPos);
        yPos += 20;

        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }
      });
    }
  }

  private async generateFinancialDisbursementPdf(
    doc: typeof PDFDocument,
    report: ReportEntity,
  ): Promise<void> {
    const data = await this.fetchFinancialDisbursementData(report);

    doc.fontSize(20).text('Financial Disbursement Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Report: ${report.name}`);
    doc.text(`Reference: ${report.referenceNumber}`);
    doc.text(
      `Period: ${String(report.startDate)} to ${String(report.endDate)}`,
    );
    doc.moveDown(2);

    doc.fontSize(14).text('Summary', { underline: true });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(`Total Disbursements: ${data.totalCount.toLocaleString()}`);
    doc.text(`Total Amount: N${data.totalAmount.toLocaleString()}`);
    doc.text(
      `Paid: ${data.paidCount.toLocaleString()} (N${data.paidAmount.toLocaleString()})`,
    );
    doc.text(
      `Pending: ${data.pendingCount.toLocaleString()} (N${data.pendingAmount.toLocaleString()})`,
    );
    doc.text(
      `Failed: ${data.failedCount.toLocaleString()} (N${data.failedAmount.toLocaleString()})`,
    );
    doc.moveDown(2);

    doc.addPage();
    doc.fontSize(14).text('Disbursement Details', { underline: true });
    doc.moveDown();

    data.disbursements.forEach((disbursement) => {
      doc.fontSize(10);
      doc.text(`Batch: ${disbursement.batchNumber}`);
      doc.text(
        `Beneficiary: ${disbursement.beneficiaryName} (${disbursement.nin})`,
      );
      doc.text(`Amount: N${disbursement.amount.toLocaleString()}`);
      doc.text(`Status: ${disbursement.status}`);
      doc.text(`Date: ${new Date(disbursement.date).toLocaleDateString()}`);
      doc.moveDown();
    });
  }

  private async generateBeneficiaryListPdf(
    doc: typeof PDFDocument,
    report: ReportEntity,
  ): Promise<void> {
    const data = await this.fetchBeneficiaryListData(report);

    doc.fontSize(20).text('Beneficiary List Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Report: ${report.name}`);
    doc.text(`Reference: ${report.referenceNumber}`);
    if (report.intervention) {
      doc.text(`Intervention: ${report.intervention.name}`);
    }
    doc.moveDown(2);

    doc
      .fontSize(14)
      .text(`Total Beneficiaries: ${data.totalCount.toLocaleString()}`, {
        underline: true,
      });
    doc.moveDown(2);

    data.beneficiaries.forEach((beneficiary) => {
      doc.fontSize(10);
      doc.text(`Name: ${beneficiary.firstName} ${beneficiary.lastName}`);
      doc.text(`NIN: ${beneficiary.nin}`);
      doc.text(`Phone: ${beneficiary.phoneNumber}`);
      doc.text(`LGA: ${beneficiary.lgaName}`);
      doc.text(`Gender: ${beneficiary.gender || 'N/A'}`);
      doc.text(`Status: ${beneficiary.status}`);
      doc.moveDown();
    });
  }

  private async generateBudgetLineReportPdf(
    doc: typeof PDFDocument,
    report: ReportEntity,
  ): Promise<void> {
    const data = await this.fetchBudgetLineData(report);

    doc.fontSize(20).text('Budget Line Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Report: ${report.name}`);
    doc.text(`Reference: ${report.referenceNumber}`);
    doc.moveDown(2);

    data.budgetLines.forEach((line) => {
      doc.fontSize(12).text(line.name, { underline: true });
      doc.moveDown();
      doc.fontSize(10);
      doc.text(`Category: ${line.category}`);
      doc.text(`Fiscal Year: ${line.fiscalYear}`);
      doc.text(`Allocated: N${line.allocatedAmount.toLocaleString()}`);
      doc.text(`Committed: N${line.committedAmount.toLocaleString()}`);
      doc.text(`Spent: N${line.spentAmount.toLocaleString()}`);
      doc.text(`Remaining: N${line.remainingAmount.toLocaleString()}`);
      doc.text(`Utilization: ${line.utilizationRate}%`);
      doc.moveDown(2);
    });
  }

  private async generateInterventionSummaryPdf(
    doc: typeof PDFDocument,
    report: ReportEntity,
  ): Promise<void> {
    const data = await this.fetchInterventionSummaryData(report);

    doc.fontSize(20).text('Intervention Summary Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Intervention: ${data.intervention.name}`);
    doc.text(`Reference: ${report.referenceNumber}`);
    doc.text(`Status: ${data.intervention.status}`);
    doc.text(
      `Period: ${data.intervention.startDate} to ${data.intervention.endDate}`,
    );
    doc.moveDown(2);

    doc.fontSize(14).text('Budget & Disbursement', { underline: true });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(
      `Allocated: N${data.intervention.budgetAllocated.toLocaleString()}`,
    );
    doc.text(`Received: N${data.intervention.budgetReceived.toLocaleString()}`);
    doc.text(`Spent: N${data.intervention.budgetSpent.toLocaleString()}`);
    doc.text(`Utilization: ${data.utilizationRate}%`);
    doc.moveDown(2);

    doc.fontSize(14).text('Enrollment Statistics', { underline: true });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(`Total Enrollments: ${data.totalEnrollments.toLocaleString()}`);
    doc.text(`Active: ${data.activeEnrollments.toLocaleString()}`);
    doc.text(`Completed: ${data.completedEnrollments.toLocaleString()}`);
    doc.moveDown(2);

    doc.fontSize(14).text('Disbursement Statistics', { underline: true });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(
      `Total Disbursements: ${data.totalDisbursements.toLocaleString()}`,
    );
    doc.text(`Total Amount: N${data.totalDisbursedAmount.toLocaleString()}`);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async generateCustomReportPdf(
    doc: typeof PDFDocument,
    report: ReportEntity,
  ): Promise<void> {
    doc.fontSize(20).text('Custom Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Report: ${report.name}`);
    doc.text(`Reference: ${report.referenceNumber}`);
    doc.text(`This is a custom report template.`);
  }

  private async generateExecutiveSummaryExcel(
    workbook: ExcelJS.Workbook,
    report: ReportEntity,
  ): Promise<void> {
    const data = await this.fetchExecutiveSummaryData(report);
    const sheet = workbook.addWorksheet('Executive Summary');

    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 40 },
      { header: 'Value', key: 'value', width: 20 },
    ];

    sheet.addRow({ metric: 'Report Name', value: report.name });
    sheet.addRow({ metric: 'Reference Number', value: report.referenceNumber });
    sheet.addRow({
      metric: 'Period',
      value: `${String(report.startDate)} to ${String(report.endDate)}`,
    });
    sheet.addRow({});

    sheet.addRow({
      metric: 'Total Budget Allocated',
      value: `₦${data.totalBudgetAllocated.toLocaleString()}`,
    });
    sheet.addRow({
      metric: 'Total Disbursed',
      value: `₦${data.totalDisbursed.toLocaleString()}`,
    });
    sheet.addRow({
      metric: 'Budget Utilization',
      value: `${data.utilizationRate}%`,
    });
    sheet.addRow({
      metric: 'Beneficiaries Reached',
      value: data.totalBeneficiaries,
    });
    sheet.addRow({
      metric: 'Pending Verification',
      value: data.pendingVerification,
    });

    if (data.topLgas.length > 0) {
      const lgaSheet = workbook.addWorksheet('Top LGAs');
      lgaSheet.columns = [
        { header: 'LGA', key: 'name', width: 30 },
        { header: 'Total Amount', key: 'amount', width: 20 },
        { header: 'Beneficiaries', key: 'count', width: 15 },
      ];

      data.topLgas.forEach((lga) => {
        lgaSheet.addRow({
          name: lga?.name?.toUpperCase() || 'N/A',
          amount: `₦${lga.totalAmount.toLocaleString()}`,
          count: lga.beneficiaryCount,
        });
      });
    }

    if (data.recentDisbursements.length > 0) {
      const disbSheet = workbook.addWorksheet('Recent Disbursements');
      disbSheet.columns = [
        { header: 'Beneficiary', key: 'beneficiary', width: 30 },
        { header: 'NIN', key: 'nin', width: 15 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
      ];

      data.recentDisbursements.forEach((disb) => {
        disbSheet.addRow({
          beneficiary: disb.beneficiaryName,
          nin: disb.nin,
          amount: `₦${disb.amount.toLocaleString()}`,
          status: disb.status,
        });
      });
    }
  }

  private async generateFinancialDisbursementExcel(
    workbook: ExcelJS.Workbook,
    report: ReportEntity,
  ): Promise<void> {
    const data = await this.fetchFinancialDisbursementData(report);
    const sheet = workbook.addWorksheet('Financial Disbursement');

    sheet.columns = [
      { header: 'Batch Number', key: 'batchNumber', width: 20 },
      { header: 'Beneficiary', key: 'beneficiary', width: 30 },
      { header: 'NIN', key: 'nin', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
    ];

    data.disbursements.forEach((disb) => {
      sheet.addRow({
        batchNumber: disb.batchNumber,
        beneficiary: disb.beneficiaryName,
        nin: disb.nin,
        amount: `₦${disb.amount.toLocaleString()}`,
        status: disb.status,
        date: new Date(disb.date).toLocaleDateString(),
      });
    });
  }

  private async generateBeneficiaryListExcel(
    workbook: ExcelJS.Workbook,
    report: ReportEntity,
  ): Promise<void> {
    const data = await this.fetchBeneficiaryListData(report);
    const sheet = workbook.addWorksheet('Beneficiaries');

    sheet.columns = [
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'NIN', key: 'nin', width: 15 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'LGA', key: 'lga', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    data.beneficiaries.forEach((ben) => {
      sheet.addRow({
        firstName: ben.firstName,
        lastName: ben.lastName,
        nin: ben.nin,
        phone: ben.phoneNumber,
        gender: ben.gender || 'N/A',
        lga: ben.lgaName,
        status: ben.status,
      });
    });
  }

  private async generateBudgetLineReportExcel(
    workbook: ExcelJS.Workbook,
    report: ReportEntity,
  ): Promise<void> {
    const data = await this.fetchBudgetLineData(report);
    const sheet = workbook.addWorksheet('Budget Lines');

    sheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Fiscal Year', key: 'fiscalYear', width: 15 },
      { header: 'Allocated', key: 'allocated', width: 15 },
      { header: 'Committed', key: 'committed', width: 15 },
      { header: 'Spent', key: 'spent', width: 15 },
      { header: 'Remaining', key: 'remaining', width: 15 },
      { header: 'Utilization %', key: 'utilization', width: 15 },
    ];

    data.budgetLines.forEach((line) => {
      sheet.addRow({
        name: line.name,
        category: line.category,
        fiscalYear: line.fiscalYear,
        allocated: `₦${line.allocatedAmount.toLocaleString()}`,
        committed: `₦${line.committedAmount.toLocaleString()}`,
        spent: `₦${line.spentAmount.toLocaleString()}`,
        remaining: `₦${line.remainingAmount.toLocaleString()}`,
        utilization: `${line.utilizationRate}%`,
      });
    });
  }

  private async generateInterventionSummaryExcel(
    workbook: ExcelJS.Workbook,
    report: ReportEntity,
  ): Promise<void> {
    const data = await this.fetchInterventionSummaryData(report);
    const sheet = workbook.addWorksheet('Intervention Summary');

    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 40 },
      { header: 'Value', key: 'value', width: 20 },
    ];

    sheet.addRow({
      metric: 'Intervention Name',
      value: data.intervention.name,
    });
    sheet.addRow({ metric: 'Status', value: data.intervention.status });
    sheet.addRow({ metric: 'Start Date', value: data.intervention.startDate });
    sheet.addRow({ metric: 'End Date', value: data.intervention.endDate });
    sheet.addRow({});
    sheet.addRow({
      metric: 'Budget Allocated',
      value: `₦${data.intervention.budgetAllocated.toLocaleString()}`,
    });
    sheet.addRow({
      metric: 'Budget Received',
      value: `₦${data.intervention.budgetReceived.toLocaleString()}`,
    });
    sheet.addRow({
      metric: 'Budget Spent',
      value: `₦${data.intervention.budgetSpent.toLocaleString()}`,
    });
    sheet.addRow({
      metric: 'Utilization Rate',
      value: `${data.utilizationRate}%`,
    });
    sheet.addRow({});
    sheet.addRow({ metric: 'Total Enrollments', value: data.totalEnrollments });
    sheet.addRow({
      metric: 'Active Enrollments',
      value: data.activeEnrollments,
    });
    sheet.addRow({
      metric: 'Completed Enrollments',
      value: data.completedEnrollments,
    });
    sheet.addRow({});
    sheet.addRow({
      metric: 'Total Disbursements',
      value: data.totalDisbursements,
    });
    sheet.addRow({
      metric: 'Total Disbursed Amount',
      value: `₦${data.totalDisbursedAmount.toLocaleString()}`,
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async generateCustomReportExcel(
    workbook: ExcelJS.Workbook,
    report: ReportEntity,
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Custom Report');
    sheet.addRow({ a: 'Report Name', b: report.name });
    sheet.addRow({ a: 'Reference Number', b: report.referenceNumber });
    sheet.addRow({ a: 'This is a custom report template.' });
  }

  private async fetchExecutiveSummaryData(report: ReportEntity): Promise<{
    totalBudgetAllocated: number;
    totalBudgetReceived: number;
    totalDisbursed: number;
    utilizationRate: number;
    totalBeneficiaries: number;
    pendingVerification: number;
    receivedVsAllocatedRate: number;
    spentVsReceivedRate: number;
    remainingBudget: number;
    cashOnHand: number;
    avgPayout: number;
    topLgas: Array<{
      name: string;
      totalAmount: number;
      beneficiaryCount: number;
    }>;
    recentDisbursements: Array<{
      beneficiaryName: string;
      nin: string;
      bankingDetails: string;
      amount: number;
      location: string;
      status: string;
    }>;
  }> {
    const where: FindOptionsWhere<InterventionEntity> = {};
    if (report.interventionId) {
      where.id = report.interventionId;
    }
    if (report.startDate && report.endDate) {
      where.start_date = LessThanOrEqual(report.endDate);
      where.end_date = MoreThanOrEqual(report.startDate);
    }

    const interventions = await this.interventionRepository.find({ where });

    const totalBudgetAllocated = interventions.reduce(
      (sum, i) => sum + Number(i.budgetAllocated || 0),
      0,
    );
    const totalBudgetReceived = interventions.reduce(
      (sum, i) => sum + Number(i.budgetReceived || 0),
      0,
    );

    const interventionIds = interventions.map((i) => i.id);

    let totalDisbursed = 0;
    if (interventionIds.length > 0) {
      const sumQb = this.disbursementRepository
        .createQueryBuilder('disbursement')
        .select('COALESCE(SUM(disbursement.amount), 0)', 'total')
        .where('disbursement.interventionId IN (:...ids)', {
          ids: interventionIds,
        });
      if (report.startDate && report.endDate) {
        sumQb.andWhere('disbursement.createdAt BETWEEN :ds AND :de', {
          ds: report.startDate,
          de: report.endDate,
        });
      }
      const row = await sumQb.getRawOne<{ total: string }>();
      totalDisbursed = parseFloat(row?.total ?? '0');
    }

    const utilizationRate =
      totalBudgetAllocated > 0
        ? Math.round((totalDisbursed / totalBudgetAllocated) * 100 * 100) / 100
        : 0;

    const receivedVsAllocatedRate =
      totalBudgetAllocated > 0
        ? Math.round((totalBudgetReceived / totalBudgetAllocated) * 100 * 100) /
          100
        : 0;

    const spentVsReceivedRate =
      totalBudgetReceived > 0
        ? Math.round((totalDisbursed / totalBudgetReceived) * 100 * 100) / 100
        : 0;

    const totalBeneficiaries =
      interventionIds.length > 0
        ? await this.enrollmentRepository.count({
            where: { intervention_id: In(interventionIds) },
          })
        : 0;

    const pendingVerification =
      interventionIds.length > 0
        ? await this.enrollmentRepository.count({
            where: {
              intervention_id: In(interventionIds),
              status: EnrollmentStatus.PENDING,
            },
          })
        : 0;

    let topLgas: Array<{
      name: string;
      total_amount: string;
      beneficiary_count: string;
    }> = [];
    let recentDisbursementsData: DisbursementEntity[] = [];

    if (interventionIds.length > 0) {
      const disbursementQuery = this.disbursementRepository
        .createQueryBuilder('disbursement')
        .leftJoin('disbursement.beneficiary', 'beneficiary')
        .select('beneficiary.lga', 'name')
        .addSelect('SUM(disbursement.amount)', 'total_amount')
        .addSelect(
          'COUNT(DISTINCT disbursement.beneficiaryId)',
          'beneficiary_count',
        )
        .where('disbursement.interventionId IN (:...ids)', {
          ids: interventionIds,
        });
      if (report.startDate && report.endDate) {
        disbursementQuery.andWhere(
          'disbursement.createdAt BETWEEN :ds AND :de',
          {
            ds: report.startDate,
            de: report.endDate,
          },
        );
      }
      disbursementQuery
        .groupBy('beneficiary.lga')
        .orderBy('total_amount', 'DESC')
        .limit(5);

      topLgas = await disbursementQuery.getRawMany();

      const recentDisbursementsQuery = this.disbursementRepository
        .createQueryBuilder('disbursement')
        .leftJoinAndSelect('disbursement.beneficiary', 'beneficiary')
        .where('disbursement.interventionId IN (:...ids)', {
          ids: interventionIds,
        });
      if (report.startDate && report.endDate) {
        recentDisbursementsQuery.andWhere(
          'disbursement.createdAt BETWEEN :ds AND :de',
          {
            ds: report.startDate,
            de: report.endDate,
          },
        );
      }
      recentDisbursementsQuery
        .orderBy('disbursement.createdAt', 'DESC')
        .limit(10);

      recentDisbursementsData = await recentDisbursementsQuery.getMany();
    }

    const remainingBudget = totalBudgetAllocated - totalDisbursed;
    const cashOnHand = totalBudgetReceived - totalDisbursed;
    const avgPayout =
      totalBeneficiaries > 0
        ? Math.round((totalDisbursed / totalBeneficiaries) * 100) / 100
        : 0;

    return {
      totalBudgetAllocated,
      totalBudgetReceived,
      totalDisbursed,
      utilizationRate,
      totalBeneficiaries,
      pendingVerification,
      receivedVsAllocatedRate,
      spentVsReceivedRate,
      remainingBudget,
      cashOnHand,
      avgPayout,
      topLgas: topLgas.map((row) => ({
        name: row.name || 'Unknown',
        totalAmount: parseFloat(row.total_amount),
        beneficiaryCount: parseInt(row.beneficiary_count, 10),
      })),
      recentDisbursements: recentDisbursementsData.map((d) => ({
        beneficiaryName: `${d.beneficiary.first_name} ${d.beneficiary.last_name}`,
        nin: d.beneficiary.nin,
        bankingDetails: `${d.bankName || 'N/A'} / ${d.accountNumber || 'N/A'}`,
        amount: Number(d.amount),
        location: d.beneficiary.lga || 'N/A',
        status: d.status,
      })),
    };
  }

  private async fetchFinancialDisbursementData(report: ReportEntity): Promise<{
    totalCount: number;
    totalAmount: number;
    paidCount: number;
    paidAmount: number;
    pendingCount: number;
    pendingAmount: number;
    failedCount: number;
    failedAmount: number;
    disbursements: Array<{
      batchNumber: string;
      beneficiaryName: string;
      nin: string;
      amount: number;
      status: string;
      date: Date;
    }>;
  }> {
    const whereClause: Record<string, unknown> = {};
    if (report.interventionId) {
      whereClause.interventionId = report.interventionId;
    }
    if (report.startDate && report.endDate) {
      whereClause.createdAt = Between(report.startDate, report.endDate);
    }

    const disbursements = await this.disbursementRepository.find({
      where: whereClause,
      relations: ['beneficiary'],
      order: { createdAt: 'DESC' },
    });

    const totalAmount = disbursements.reduce(
      (sum, d) => sum + Number(d.amount),
      0,
    );
    const paidDisbursements = disbursements.filter(
      (d) => d.status === DisbursementStatus.PAID,
    );
    const pendingDisbursements = disbursements.filter(
      (d) => d.status === DisbursementStatus.PENDING,
    );
    const failedDisbursements = disbursements.filter(
      (d) => d.status === DisbursementStatus.FAILED,
    );

    return {
      totalCount: disbursements.length,
      totalAmount,
      paidCount: paidDisbursements.length,
      paidAmount: paidDisbursements.reduce(
        (sum, d) => sum + Number(d.amount),
        0,
      ),
      pendingCount: pendingDisbursements.length,
      pendingAmount: pendingDisbursements.reduce(
        (sum, d) => sum + Number(d.amount),
        0,
      ),
      failedCount: failedDisbursements.length,
      failedAmount: failedDisbursements.reduce(
        (sum, d) => sum + Number(d.amount),
        0,
      ),
      disbursements: disbursements.map((d) => ({
        batchNumber: d.batchNumber,
        beneficiaryName: `${d.beneficiary.first_name} ${d.beneficiary.last_name}`,
        nin: d.beneficiary.nidhh,
        amount: Number(d.amount),
        status: d.status,
        date: d.createdAt,
      })),
    };
  }

  private async fetchBeneficiaryListData(report: ReportEntity): Promise<{
    totalCount: number;
    beneficiaries: Array<{
      firstName: string;
      lastName: string;
      nin: string;
      phoneNumber: string;
      gender: string | null;
      lgaName: string;
      status: string;
    }>;
  }> {
    let beneficiaries: BeneficiaryEntity[] = [];

    if (report.interventionId) {
      const enrollments = await this.enrollmentRepository.find({
        where: { intervention_id: report.interventionId },
        relations: ['beneficiary'],
      });
      beneficiaries = enrollments.map((e) => e.beneficiary);
    } else {
      beneficiaries = await this.beneficiaryRepository.find();
    }

    return {
      totalCount: beneficiaries.length,
      beneficiaries: beneficiaries.map((b) => ({
        firstName: b.first_name,
        lastName: b.last_name,
        nin: b.nidhh,
        phoneNumber: b.phone_number,
        gender: b.gender,
        lgaName: b.lga || 'N/A',
        status: b.status,
      })),
    };
  }

  private async fetchBudgetLineData(report: ReportEntity): Promise<{
    budgetLines: Array<{
      name: string;
      category: string;
      fiscalYear: string;
      allocatedAmount: number;
      committedAmount: number;
      spentAmount: number;
      remainingAmount: number;
      utilizationRate: number;
    }>;
  }> {
    const whereClause: Record<string, unknown> = {};
    if (report.config?.fiscalYearId) {
      whereClause.fiscalYearId = report.config.fiscalYearId;
    }

    const budgetLines = await this.budgetLineRepository.find({
      where: whereClause,
      relations: ['fiscalYear'],
    });

    return {
      budgetLines: budgetLines.map((line) => ({
        name: line.name,
        category: line.category,
        fiscalYear: line.fiscalYear?.name || 'N/A',
        allocatedAmount: Number(line.allocatedAmount),
        committedAmount: Number(line.committedAmount),
        spentAmount: Number(line.spentAmount),
        remainingAmount: Number(line.remainingAmount),
        utilizationRate:
          Number(line.allocatedAmount) > 0
            ? Math.round(
                (Number(line.spentAmount) / Number(line.allocatedAmount)) *
                  100 *
                  100,
              ) / 100
            : 0,
      })),
    };
  }

  private async fetchInterventionSummaryData(report: ReportEntity): Promise<{
    intervention: {
      name: string;
      status: string;
      startDate: string;
      endDate: string;
      budgetAllocated: number;
      budgetReceived: number;
      budgetSpent: number;
    };
    utilizationRate: number;
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    totalDisbursements: number;
    totalDisbursedAmount: number;
  }> {
    if (!report.interventionId) {
      throw new Error(
        'Intervention ID is required for Intervention Summary report',
      );
    }

    const intervention = await this.interventionRepository.findOne({
      where: { id: report.interventionId },
    });

    if (!intervention) {
      throw new Error(
        `Intervention with ID ${report.interventionId} not found`,
      );
    }

    const enrollments = await this.enrollmentRepository.find({
      where: { intervention_id: intervention.id },
    });

    const disbursements = await this.disbursementRepository.find({
      where: { interventionId: intervention.id },
    });

    const totalDisbursedAmount = disbursements.reduce(
      (sum, d) => sum + Number(d.amount),
      0,
    );

    const budgetAllocated = Number(intervention.budgetAllocated || 0);
    const budgetReceived = Number(intervention.budgetReceived || 0);
    const budgetSpent = Number(intervention.budgetSpent || 0);

    return {
      intervention: {
        name: intervention.name,
        status: intervention.status,
        startDate: intervention.start_date.toISOString().split('T')[0],
        endDate: intervention.end_date.toISOString().split('T')[0],
        budgetAllocated,
        budgetReceived,
        budgetSpent,
      },
      utilizationRate:
        budgetAllocated > 0
          ? Math.round((budgetSpent / budgetAllocated) * 100 * 100) / 100
          : 0,
      totalEnrollments: enrollments.length,
      activeEnrollments: enrollments.filter(
        (e) => e.status === EnrollmentStatus.PENDING,
      ).length,
      completedEnrollments: enrollments.filter(
        (e) => e.status === EnrollmentStatus.COMPLETED,
      ).length,
      totalDisbursements: disbursements.length,
      totalDisbursedAmount,
    };
  }
}
