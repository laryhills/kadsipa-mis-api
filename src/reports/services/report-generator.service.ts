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

type PdfDoc = InstanceType<typeof PDFDocument>;
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

  /**
   * PDF built-ins (e.g. Helvetica) do not include ₦ (U+20A6); `style: 'currency'` renders a bad glyph.
   * Use ISO 4217 code + number instead of a custom "N̶" (strikethrough N) which is also unreliable.
   */
  private pdfFmtNgnCompact(n: number): string {
    const num = new Intl.NumberFormat('en-NG', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
    return `NGN ${num}`;
  }

  private pdfFmtNgn(n: number): string {
    const num = new Intl.NumberFormat('en-NG', {
      maximumFractionDigits: 0,
    }).format(n);
    return `NGN ${num}`;
  }

  private reportMoneyCell(n: number): string {
    return `NGN ${n.toLocaleString('en-NG')}`;
  }

  private pdfDrawHProgressBar(
    doc: PdfDoc,
    x: number,
    y: number,
    width: number,
    height: number,
    percent: number,
    fillHex: string,
    trackHex: string,
  ): void {
    const p = Math.min(100, Math.max(0, percent));
    doc.save();
    doc.rect(x, y, width, height).fill(trackHex);
    const fillW = (width * p) / 100;
    if (fillW > 0.5) {
      doc.rect(x, y, fillW, height).fill(fillHex);
    }
    doc.restore();
  }

  private pdfRoundedChip(
    doc: PdfDoc,
    x: number,
    y: number,
    width: number,
    height: number,
    bg: string,
    border: string,
    label: string,
    textColor: string,
    fontSize = 8,
  ): void {
    const r = 3;
    doc.save();
    doc.roundedRect(x, y, width, height, r).fill(bg);
    doc
      .lineWidth(0.45)
      .strokeColor(border)
      .roundedRect(x, y, width, height, r)
      .stroke();
    doc.fillColor(textColor).font('Helvetica').fontSize(fontSize);
    doc.text(label, x + 8, y + (height - fontSize) / 2 - 1, {
      width: width - 16,
      lineBreak: false,
    });
    doc.restore();
  }

  private pdfDisbursementStatusColors(status: string): {
    fill: string;
    stroke: string;
    text: string;
  } {
    const s = status.toLowerCase();
    if (s === 'paid') {
      return { fill: '#defce8', stroke: '#c6edd3', text: '#44875d' };
    }
    if (s === 'processing') {
      return { fill: '#fcfbde', stroke: '#fff892', text: '#ba750e' };
    }
    if (s === 'pending') {
      return { fill: '#fffbeb', stroke: '#fde68a', text: '#b45309' };
    }
    if (s === 'failed') {
      return { fill: '#fef2f2', stroke: '#fecaca', text: '#b91c1c' };
    }
    return { fill: '#f9fafb', stroke: '#e5e7eb', text: '#4b5563' };
  }

  private pdfReportStatusChipStyle(status: string): {
    bg: string;
    border: string;
    text: string;
    label: string;
  } {
    switch (status) {
      case 'Finalised':
        return {
          bg: '#eefdf3',
          border: '#d4fde7',
          text: '#008234',
          label: 'Finalised',
        };
      case 'Draft':
        return {
          bg: '#FFFBEB',
          border: '#fde68a',
          text: '#b45309',
          label: 'Draft',
        };
      case 'Processing':
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          text: '#1d4ed8',
          label: 'Processing',
        };
      case 'Failed':
        return {
          bg: '#fef2f2',
          border: '#fecaca',
          text: '#991b1b',
          label: 'Failed',
        };
      default:
        return {
          bg: '#ffffff',
          border: '#e8e8e8',
          text: '#475467',
          label: status,
        };
    }
  }

  private async generateExecutiveSummaryPdf(
    doc: typeof PDFDocument,
    report: ReportEntity,
  ): Promise<void> {
    const data = await this.fetchExecutiveSummaryData(report);
    const margin = 40;
    const pageH = doc.page.height;
    const pageW = doc.page.width;
    const contentW = pageW - margin * 2;
    let y = margin;

    const reportTypeLabel =
      report.reportType === ReportType.EXECUTIVE_SUMMARY
        ? 'Executive Summary'
        : String(report.reportType)
            .replace(/([A-Z])/g, ' $1')
            .trim();

    const fmtDay = (d: Date | string) => {
      const dt = d instanceof Date ? d : new Date(d);
      return Number.isNaN(dt.getTime())
        ? '—'
        : dt.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
    };

    const fmtGen = (d: Date | string | null | undefined) => {
      if (!d) return '—';
      const dt = d instanceof Date ? d : new Date(d);
      return Number.isNaN(dt.getTime())
        ? '—'
        : dt.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
    };

    const headerRightX = margin + contentW * 0.62;
    const headerLeftW = contentW * 0.58;
    const chipRowY = y;
    const chipH = 18;

    doc.font('Helvetica').fontSize(8);
    const stStyle = this.pdfReportStatusChipStyle(String(report.status));
    const statusLabel = stStyle.label;
    const statusChipW = Math.min(
      doc.widthOfString(statusLabel) + 22,
      headerLeftW * 0.42,
    );
    this.pdfRoundedChip(
      doc,
      margin,
      chipRowY,
      statusChipW,
      chipH,
      stStyle.bg,
      stStyle.border,
      statusLabel,
      stStyle.text,
      8,
    );

    const periodText = `Period:  ${fmtDay(report.startDate)}  →  ${fmtDay(report.endDate)}`;
    doc.font('Helvetica').fontSize(8);
    const periodChipW = Math.min(
      doc.widthOfString(periodText) + 22,
      headerLeftW - statusChipW - 10,
    );
    this.pdfRoundedChip(
      doc,
      margin + statusChipW + 8,
      chipRowY,
      periodChipW,
      chipH,
      '#ffffff',
      '#e8e8e8',
      periodText,
      '#475467',
      7,
    );

    doc.font('Helvetica').fontSize(9).fillColor('#6c7481');
    doc.text('Generated on', headerRightX, chipRowY + 1, {
      width: contentW * 0.38,
      align: 'right',
    });
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10);
    doc.text(
      fmtGen(report.generatedAt ?? undefined),
      headerRightX,
      chipRowY + 12,
      {
        width: contentW * 0.38,
        align: 'right',
      },
    );

    y = chipRowY + chipH + 14;

    doc.fillColor('#111827').fontSize(22).font('Helvetica-Bold');
    doc.text(reportTypeLabel, margin, y, { width: headerLeftW + 40 });
    y = doc.y + 8;

    if (report.intervention?.name) {
      doc.font('Helvetica').fontSize(8).fillColor('#7b7b7b');
      doc.text('Active Filters:', margin, y);
      y = doc.y + 4;
      doc.fontSize(8);
      const afW = Math.min(
        doc.widthOfString(report.intervention.name) + 18,
        contentW * 0.65,
      );
      this.pdfRoundedChip(
        doc,
        margin,
        y,
        afW,
        16,
        '#f9f9f9',
        '#f1f1f1',
        report.intervention.name,
        '#343434',
        8,
      );
      y = y + 22;
    }

    doc.font('Helvetica').fontSize(9).fillColor('#7b7b7b');
    doc.text(`Ref: ${report.referenceNumber}`, margin, y);
    y = doc.y + 14;

    doc.strokeColor('#e9e9e9').lineWidth(1);
    doc
      .moveTo(margin, y)
      .lineTo(margin + contentW, y)
      .stroke();
    y += 18;

    const gap = 8;
    const cardH = 86;
    const cardW = (contentW - 3 * gap) / 4;
    const cardsY = y;

    const drawMetricCard = (
      cx: number,
      cy: number,
      title: string,
      value: string,
      sub: string,
      opts?: {
        fill?: string;
        stroke?: string;
        titleColor?: string;
        subColor?: string;
      },
    ) => {
      if (opts?.fill) {
        doc.fillColor(opts.fill).rect(cx, cy, cardW, cardH).fill();
      }
      doc.lineWidth(0.6);
      doc.strokeColor(opts?.stroke ?? '#e9e9e9');
      doc.rect(cx, cy, cardW, cardH).stroke();
      doc
        .fillColor(opts?.titleColor ?? '#111827')
        .font('Helvetica-Bold')
        .fontSize(9);
      doc.text(title, cx + 8, cy + 10, { width: cardW - 16 });
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(18);
      doc.text(value, cx + 8, cy + 32, { width: cardW - 16 });
      doc.font('Helvetica').fontSize(8);
      doc.fillColor(
        opts?.subColor ?? (opts?.stroke === '#aabc85' ? '#577241' : '#645E82'),
      );
      doc.text(sub, cx + 8, cy + 58, { width: cardW - 16 });
    };

    drawMetricCard(
      margin,
      cardsY,
      'Budget Allocated',
      this.pdfFmtNgnCompact(data.totalBudgetAllocated),
      'For selected period',
    );

    drawMetricCard(
      margin + cardW + gap,
      cardsY,
      'Disbursed Amount',
      this.pdfFmtNgnCompact(data.totalDisbursed),
      `${data.utilizationRate.toFixed(1)}% Utilization`,
      {
        fill: '#eef5d5',
        stroke: '#aabc85',
        titleColor: '#5e7446',
      },
    );

    const benSub =
      data.beneficiariesAddedInPeriod > 0
        ? `+${data.beneficiariesAddedInPeriod.toLocaleString('en-NG')} in this period`
        : 'Total enrolled';

    drawMetricCard(
      margin + 2 * (cardW + gap),
      cardsY,
      'Beneficiaries Reached',
      data.totalBeneficiaries.toLocaleString('en-NG'),
      benSub,
      { subColor: '#7a9f3c' },
    );

    drawMetricCard(
      margin + 3 * (cardW + gap),
      cardsY,
      'Pending Verification',
      data.pendingVerification.toLocaleString('en-NG'),
      'Applications in queue',
    );

    y = cardsY + cardH + 22;

    const colGap = 14;
    const leftColW = contentW * 0.52;
    const rightColW = contentW - leftColW - colGap;
    const leftX = margin;
    const rightX = margin + leftColW + colGap;
    const splitTop = y;

    /* doc.save();
    doc
      .roundedRect(leftX - 4, splitTop - 4, leftColW + 8, 212, 4)
      .fill('#fafafa');
    doc
      .roundedRect(rightX - 4, splitTop - 4, rightColW + 8, 212, 4)
      .fill('#fafafa');
    doc.restore(); */

    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12);
    doc.text('Fund Utilisation Analysis', leftX, y);
    y = doc.y + 10;

    doc.font('Helvetica').fontSize(9).fillColor('#374151');
    doc.text(
      `Received vs Allocated    ${data.receivedVsAllocatedRate.toFixed(1)}%`,
      leftX,
      y,
    );
    y += 11;
    this.pdfDrawHProgressBar(
      doc,
      leftX,
      y,
      leftColW,
      6,
      data.receivedVsAllocatedRate,
      '#9ca3af',
      '#e5e7eb',
    );
    y += 12;
    doc.fontSize(8).fillColor('#6b7280');
    doc.text(
      `Received: ${this.pdfFmtNgn(data.totalBudgetReceived)}   ·   Allocated: ${this.pdfFmtNgn(data.totalBudgetAllocated)}`,
      leftX,
      y,
      { width: leftColW },
    );
    y = doc.y + 12;

    doc.fontSize(9).fillColor('#374151');
    doc.text(
      `Spent vs Received    ${data.spentVsReceivedRate.toFixed(1)}%`,
      leftX,
      y,
    );
    y += 11;
    this.pdfDrawHProgressBar(
      doc,
      leftX,
      y,
      leftColW,
      6,
      data.spentVsReceivedRate,
      '#577241',
      '#e8eee0',
    );
    y += 12;
    doc.fontSize(8).fillColor('#6b7280');
    doc.text(
      `Spent: ${this.pdfFmtNgn(data.totalDisbursed)}   ·   Received: ${this.pdfFmtNgn(data.totalBudgetReceived)}`,
      leftX,
      y,
      { width: leftColW },
    );
    y = doc.y + 14;

    const third = leftColW / 3;
    doc.fontSize(7).fillColor('#9ca3af').font('Helvetica-Bold');
    doc.text('REMAINING BUDGET', leftX, y);
    doc.text('CASH ON HAND', leftX + third, y);
    doc.text('AVG. PAYOUT', leftX + 2 * third, y);
    y += 10;
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9);
    doc.text(this.pdfFmtNgnCompact(data.remainingBudget), leftX, y);
    doc.text(this.pdfFmtNgnCompact(data.cashOnHand), leftX + third, y);
    doc.text(this.pdfFmtNgn(data.avgPayout), leftX + 2 * third, y);
    y = doc.y + 6;

    let yRight = splitTop;
    // doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12);
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Top LGAs by Disbursal', rightX, yRight);
    yRight = doc.y + 8;

    if (data.topLgas.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
      doc.text('No disbursement data for this period.', rightX, yRight);
      yRight = doc.y + 6;
    } else {
      const maxAmt = Math.max(...data.topLgas.map((l) => l.totalAmount), 1);
      const barColors = ['#577241', '#6d8a52', '#8faa6e', '#a5cb5a', '#c5d9a0'];
      data.topLgas.forEach((lga, idx) => {
        doc.font('Helvetica').fontSize(8).fillColor('#374151');
        doc.text(lga.name, rightX, yRight, { width: rightColW * 0.58 });
        doc.text(
          this.pdfFmtNgnCompact(lga.totalAmount),
          rightX + rightColW * 0.58,
          yRight,
          { width: rightColW * 0.42, align: 'right' },
        );
        yRight += 10;
        const pct = (lga.totalAmount / maxAmt) * 100;
        this.pdfDrawHProgressBar(
          doc,
          rightX,
          yRight,
          rightColW,
          5,
          pct,
          barColors[idx % barColors.length] ?? '#577241',
          '#f3f4f6',
        );
        yRight += 12;
      });
    }

    y = Math.max(y, yRight) + 24;

    if (y > pageH - 100) {
      doc.addPage();
      y = margin;
    }

    doc.save();
    doc.roundedRect(margin - 2, y - 4, contentW + 4, 28, 3).fill('#fafafa');
    doc
      .lineWidth(0.6)
      .strokeColor('#e9e9e9')
      .roundedRect(margin - 2, y - 4, contentW + 4, 28, 3)
      .stroke();
    doc.restore();

    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12);
    doc.text('Recent Disbursement Log', margin + 8, y + 2, {
      width: contentW * 0.62,
    });
    doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
    doc.text(
      `Last updated: ${fmtGen(report.generatedAt ?? undefined)}`,
      margin + 8,
      y + 16,
      { width: contentW - 16, align: 'right' },
    );
    y += 32;

    const wB = contentW * 0.23;
    const wN = contentW * 0.11;
    const wK = contentW * 0.24;
    const wA = contentW * 0.13;
    const wL = contentW * 0.14;
    const wS = contentW * 0.15;
    const colX = [
      margin,
      margin + wB,
      margin + wB + wN,
      margin + wB + wN + wK,
      margin + wB + wN + wK + wA,
      margin + wB + wN + wK + wA + wL,
    ];

    const drawDisbursementHeader = (yy: number): number => {
      const hh = 24;
      doc.save();
      doc.rect(margin, yy, contentW, hh).fill('#fafafa');
      doc
        .lineWidth(0.6)
        .strokeColor('#e9e9e9')
        .rect(margin, yy, contentW, hh)
        .stroke();
      doc.fillColor('#577241').font('Helvetica-Bold').fontSize(8);
      const titles = [
        'Beneficiary',
        'NIN',
        'Banking Details',
        'Amount',
        'Location',
        'Status',
      ];
      const widths = [wB, wN, wK, wA, wL, wS];
      for (let i = 0; i < 6; i++) {
        doc.text(titles[i], colX[i] + 4, yy + 8, { width: widths[i] - 8 });
      }
      doc.restore();
      return yy + hh;
    };

    const slice = data.recentDisbursements.slice(0, 14);
    let rowY = drawDisbursementHeader(y);
    const rowH = 28;
    const footerReserve = 48;

    for (const row of slice) {
      if (rowY + rowH > pageH - footerReserve) {
        doc.addPage();
        rowY = drawDisbursementHeader(margin);
      }
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#475467');
      doc.text(row.beneficiaryName, colX[0] + 4, rowY + 6, {
        width: wB - 8,
      });
      doc.font('Helvetica').fillColor('#747e8c');
      doc.text(row.nin, colX[1] + 4, rowY + 6, { width: wN - 8 });
      doc.text(row.bankingDetails, colX[2] + 4, rowY + 6, {
        width: wK - 8,
      });
      doc.font('Helvetica-Bold').fillColor('#475467');
      doc.text(this.pdfFmtNgn(row.amount), colX[3] + 4, rowY + 6, {
        width: wA - 8,
      });
      doc.font('Helvetica').fillColor('#747e8c');
      doc.text(row.location, colX[4] + 4, rowY + 6, { width: wL - 8 });
      const dst = this.pdfDisbursementStatusColors(row.status);
      doc.font('Helvetica-Bold').fontSize(6.5);
      const badgeW = Math.min(
        wS - 8,
        Math.max(52, doc.widthOfString(row.status) + 16),
      );
      doc.save();
      doc.roundedRect(colX[5] + 4, rowY + 5, badgeW, 16, 8).fill(dst.fill);
      doc
        .lineWidth(0.35)
        .strokeColor(dst.stroke)
        .roundedRect(colX[5] + 4, rowY + 5, badgeW, 16, 8)
        .stroke();
      doc.fillColor(dst.text).font('Helvetica-Bold').fontSize(6.5);
      doc.text(row.status, colX[5] + 8, rowY + 9, { width: badgeW - 12 });
      doc.restore();

      rowY += rowH;
      doc.strokeColor('#f3f4f6').lineWidth(0.45);
      doc
        .moveTo(margin, rowY - 1)
        .lineTo(margin + contentW, rowY - 1)
        .stroke();
    }

    const totalRec =
      data.disbursementCountInPeriod > 0
        ? data.disbursementCountInPeriod
        : data.totalBeneficiaries;
    doc.fontSize(8).fillColor('#6b7280').font('Helvetica');
    doc.text(
      `Showing ${slice.length} most recent transactions from a total of ${totalRec.toLocaleString('en-NG')} records.`,
      margin,
      rowY + 8,
      { width: contentW },
    );
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
    doc.text(`Total Amount: NGN ${data.totalAmount.toLocaleString()}`);
    doc.text(
      `Paid: ${data.paidCount.toLocaleString()} (NGN ${data.paidAmount.toLocaleString()})`,
    );
    doc.text(
      `Pending: ${data.pendingCount.toLocaleString()} (NGN ${data.pendingAmount.toLocaleString()})`,
    );
    doc.text(
      `Failed: ${data.failedCount.toLocaleString()} (NGN ${data.failedAmount.toLocaleString()})`,
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
      doc.text(`Amount: NGN ${disbursement.amount.toLocaleString()}`);
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
      doc.text(`Allocated: NGN ${line.allocatedAmount.toLocaleString()}`);
      doc.text(`Committed: NGN ${line.committedAmount.toLocaleString()}`);
      doc.text(`Spent: NGN ${line.spentAmount.toLocaleString()}`);
      doc.text(`Remaining: NGN ${line.remainingAmount.toLocaleString()}`);
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
      `Allocated: NGN ${data.intervention.budgetAllocated.toLocaleString()}`,
    );
    doc.text(
      `Received: NGN ${data.intervention.budgetReceived.toLocaleString()}`,
    );
    doc.text(`Spent: NGN ${data.intervention.budgetSpent.toLocaleString()}`);
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
    doc.text(`Total Amount: NGN ${data.totalDisbursedAmount.toLocaleString()}`);
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
      value: this.reportMoneyCell(data.totalBudgetAllocated),
    });
    sheet.addRow({
      metric: 'Total Disbursed',
      value: this.reportMoneyCell(data.totalDisbursed),
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
          amount: this.reportMoneyCell(lga.totalAmount),
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
          amount: this.reportMoneyCell(disb.amount),
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
        amount: this.reportMoneyCell(disb.amount),
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
        allocated: this.reportMoneyCell(line.allocatedAmount),
        committed: this.reportMoneyCell(line.committedAmount),
        spent: this.reportMoneyCell(line.spentAmount),
        remaining: this.reportMoneyCell(line.remainingAmount),
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
      value: this.reportMoneyCell(data.intervention.budgetAllocated),
    });
    sheet.addRow({
      metric: 'Budget Received',
      value: this.reportMoneyCell(data.intervention.budgetReceived),
    });
    sheet.addRow({
      metric: 'Budget Spent',
      value: this.reportMoneyCell(data.intervention.budgetSpent),
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
      value: this.reportMoneyCell(data.totalDisbursedAmount),
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
    beneficiariesAddedInPeriod: number;
    disbursementCountInPeriod: number;
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

    let beneficiariesAddedInPeriod = 0;
    let disbursementCountInPeriod = 0;
    if (interventionIds.length > 0 && report.startDate && report.endDate) {
      beneficiariesAddedInPeriod = await this.enrollmentRepository.count({
        where: {
          intervention_id: In(interventionIds),
          created_at: Between(report.startDate, report.endDate),
        },
      });
      disbursementCountInPeriod = await this.disbursementRepository.count({
        where: {
          interventionId: In(interventionIds),
          createdAt: Between(report.startDate, report.endDate),
        },
      });
    }

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
      beneficiariesAddedInPeriod,
      disbursementCountInPeriod,
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
