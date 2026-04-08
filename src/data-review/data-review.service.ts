import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import csvParser from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import {
  PendingBeneficiaryEntity,
  PendingBeneficiarySourceType,
  PendingBeneficiaryStatus,
} from './entities/pending-beneficiary.entity';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import { InterventionsService } from '../interventions/interventions.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { UploadNotificationsService } from '../notifications/upload-notifications.service';
import { NotificationType } from '../notifications/entities/upload-notification.entity';
import type { ApprovePendingDto } from './dto/approve-pending.dto';
import type { RejectPendingDto } from './dto/reject-pending.dto';
import type { LinkPendingDto } from './dto/link-pending.dto';

export interface UploadResult {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  pendingIds: string[];
}

export interface FormSchemaField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  inferredFrom?: string;
  options?: string[];
}

export interface FormSchema {
  coreFields: string[];
  customFields: FormSchemaField[];
}

@Injectable()
export class DataReviewService {
  private readonly coreFields = [
    'nin',
    'first_name',
    'last_name',
    'phone_number',
    'bank',
    'account_number',
    'account_name',
    'address',
    'amount',
    'lga',
    'ward',
    'date_of_birth',
    'email',
    'gender',
    'has_disability',
    'disability_type',
  ];

  constructor(
    @InjectRepository(PendingBeneficiaryEntity)
    private readonly pendingBeneficiaryRepository: Repository<PendingBeneficiaryEntity>,
    private readonly beneficiariesService: BeneficiariesService,
    private readonly interventionsService: InterventionsService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly uploadNotificationsService: UploadNotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async uploadBeneficiaries(
    file: Express.Multer.File,
    interventionId: string,
    userId: string,
  ): Promise<UploadResult> {
    await this.uploadNotificationsService.create({
      interventionId,
      type: NotificationType.UPLOAD_STARTED,
      title: 'Processing Upload',
      message: `Uploading ${file.originalname}...`,
      metadata: { fileName: file.originalname, status: 'processing' },
      sourceFile: file.originalname,
      createdById: userId,
    });

    try {
      const rows = await this.parseFile(file);
      const headers = Object.keys(rows[0]).map((h) => h.toLowerCase().trim());

      const detectedCore = headers.filter((h) =>
        this.coreFields.includes(h.replace(/\s+/g, '')),
      );
      const customFields = headers.filter(
        (h) => !this.coreFields.includes(h.replace(/\s+/g, '')),
      );

      const formSchema: FormSchema = {
        coreFields: detectedCore,
        customFields: customFields.map((field) => ({
          name: field,
          type: this.inferFieldType(rows, field),
          label: this.formatLabel(field),
          required: this.isFieldPopulated(rows, field),
        })),
      };

      await this.interventionsService.updateFormSchema(
        interventionId,
        formSchema as unknown as Record<string, unknown>,
      );

      const results: UploadResult = {
        total: rows.length,
        valid: 0,
        invalid: 0,
        duplicates: 0,
        pendingIds: [],
      };

      // Track NIDs seen in this CSV to detect intra-CSV duplicates
      const ninsInCurrentUpload = new Map<string, string>(); // NIN -> first pending record ID
      let csvDuplicateCount = 0;

      for (const row of rows) {
        const coreData: Record<string, unknown> = {};
        const customData: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = key.toLowerCase().trim();
          if (this.coreFields.includes(normalizedKey.replace(/\s+/g, ''))) {
            coreData[normalizedKey] = value;
          } else {
            customData[key] = value;
          }
        }

        const errors = this.validateBeneficiaryData(coreData);
        if (errors.length > 0) {
          throw new BadRequestException(
            `File must contain valid beneficiary data : ${errors.map((error) => error.field).join(', ')} is missing`,
          );
        }

        let duplicateStatus = PendingBeneficiaryStatus.PENDING_REVIEW;
        let duplicateOfId: string | undefined = undefined;
        let isDuplicateInCSV = false;

        // Extract and type-check NIN
        const nin = coreData.nin;
        if (nin && typeof nin === 'string') {
          // First, check if this NIN already appeared in this CSV upload
          const firstOccurrenceId = ninsInCurrentUpload.get(nin);
          if (firstOccurrenceId) {
            // Duplicate within the same CSV file
            duplicateStatus = PendingBeneficiaryStatus.DUPLICATE;
            duplicateOfId = firstOccurrenceId; // Reference the first occurrence in this upload
            isDuplicateInCSV = true;
            csvDuplicateCount++;
            results.duplicates++;

            // Add validation error to indicate CSV duplicate
            errors.push({
              field: 'nin',
              message: `Duplicate NIN in this CSV file (first occurrence will be processed)`,
            });
          } else {
            // Check against existing database records
            const existing = await this.beneficiariesService.findByNIN(nin);
            if (existing) {
              duplicateStatus = PendingBeneficiaryStatus.DUPLICATE;
              duplicateOfId = existing.id;
              results.duplicates++;
            }
          }
        }

        const pending = await this.pendingBeneficiaryRepository.save({
          sourceType: PendingBeneficiarySourceType.BULK_UPLOAD,
          sourceReference: file.originalname,
          coreData,
          customData,
          validationErrors: errors,
          status: duplicateStatus,
          duplicateOfBeneficiaryId: duplicateOfId,
          interventionId,
          uploadedById: userId,
        });

        // Track this NIN for intra-CSV duplicate detection (only if it's the first occurrence)
        if (nin && typeof nin === 'string' && !isDuplicateInCSV) {
          ninsInCurrentUpload.set(nin, pending.id);
        }

        if (errors.length > 0) {
          results.invalid++;
        } else if (duplicateStatus !== PendingBeneficiaryStatus.DUPLICATE) {
          results.valid++;
        }

        results.pendingIds.push(pending.id);
      }

      // Build detailed message including CSV duplicates info
      const messageParts = [
        `${results.valid} valid`,
        `${results.duplicates} duplicates`,
      ];
      if (csvDuplicateCount > 0) {
        messageParts.push(`(${csvDuplicateCount} within CSV)`);
      }
      messageParts.push(`${results.invalid} errors`);

      await this.uploadNotificationsService.create({
        interventionId,
        type: NotificationType.UPLOAD_COMPLETED,
        title: 'Upload Completed',
        message: `${results.total} records processed: ${messageParts.join(', ')}`,
        metadata: {
          fileName: file.originalname,
          totalRecords: results.total,
          validCount: results.valid,
          duplicateCount: results.duplicates,
          csvDuplicateCount: csvDuplicateCount,
          errorCount: results.invalid,
          pendingReviewCount: results.valid + results.duplicates,
        },
        sourceFile: file.originalname,
        createdById: userId,
      });

      return results;
    } catch (error) {
      await this.uploadNotificationsService.create({
        interventionId,
        type: NotificationType.UPLOAD_FAILED,
        title: 'Upload Failed',
        message: `Failed to process ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          fileName: file.originalname,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        sourceFile: file.originalname,
        createdById: userId,
      });

      throw error;
    }
  }

  private async parseFile(
    file: Express.Multer.File,
  ): Promise<Array<Record<string, string>>> {
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      return await this.parseCSV(file.buffer);
    } else if (ext === 'xlsx' || ext === 'xls') {
      return this.parseExcel(file.buffer);
    } else {
      throw new BadRequestException(
        'Unsupported file format. Please upload CSV or Excel files.',
      );
    }
  }

  private async parseCSV(
    buffer: Buffer,
  ): Promise<Array<Record<string, string>>> {
    return new Promise((resolve, reject) => {
      const results: Array<Record<string, string>> = [];
      const stream = Readable.from(buffer);

      stream
        .pipe(csvParser())
        .on('data', (data: Record<string, string>) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error: Error) => reject(error));
    });
  }

  private parseExcel(buffer: Buffer): Array<Record<string, string>> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
    });

    return jsonData as Array<Record<string, string>>;
  }

  private inferFieldType(
    rows: Array<Record<string, unknown>>,
    field: string,
  ): string {
    const values = rows
      .map((r) => r[field])
      .filter((v) => v !== null && v !== undefined && v !== '');

    if (values.length === 0) return 'text';

    const numericCount = values.filter((v) => !isNaN(Number(v))).length;
    const dateCount = values.filter((v) => this.isValidDate(String(v))).length;

    if (numericCount / values.length > 0.8) return 'number';
    if (dateCount / values.length > 0.8) return 'date';

    return 'text';
  }

  private formatLabel(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  }

  private isFieldPopulated(
    rows: Array<Record<string, unknown>>,
    field: string,
  ): boolean {
    const populatedCount = rows.filter(
      (r) => r[field] !== null && r[field] !== undefined && r[field] !== '',
    ).length;
    return populatedCount / rows.length > 0.9;
  }

  private validateBeneficiaryData(
    data: Record<string, unknown>,
  ): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!data.nin) {
      errors.push({ field: 'nin', message: 'NIN is required' });
    }

    if (!data.first_name) {
      errors.push({ field: 'firstname', message: 'First name is required' });
    }

    if (!data.last_name) {
      errors.push({ field: 'lastname', message: 'Last name is required' });
    }

    if (
      !data.phone_number ||
      (typeof data.phone_number === 'string' &&
        !/^[0-9]{10,11}$/.test(data.phone_number))
    ) {
      errors.push({
        field: 'phone_number',
        message: 'Phone number must be 10-11 digits',
      });
    }

    if (
      !data.account_number ||
      (typeof data.account_number === 'string' &&
        !/^[0-9]{10}$/.test(data.account_number))
    ) {
      errors.push({
        field: 'account_number',
        message: 'Account number must be 10 digits',
      });
    }

    if (
      !data.bank ||
      (typeof data.bank === 'string' && !/^[A-Za-z0-9\s]+$/.test(data.bank))
    ) {
      errors.push({
        field: 'bank',
        message: 'Bank name is required and must be alphanumeric',
      });
    }

    if (
      !data.account_name ||
      (typeof data.account_name === 'string' &&
        !/^[A-Za-z0-9\s]+$/.test(data.account_name))
    ) {
      errors.push({
        field: 'account_name',
        message: 'Account name is required and must be alphanumeric',
      });
    }

    if (
      !data.amount ||
      (typeof data.amount === 'string' && !/^[0-9]+$/.test(data.amount))
    ) {
      errors.push({
        field: 'amount',
        message: 'Amount is required and must be a number',
      });
    }

    return errors;
  }

  private isValidDate(value: string): boolean {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  async findAllPending(
    status?: PendingBeneficiaryStatus,
    interventionId?: string,
  ): Promise<PendingBeneficiaryEntity[]> {
    const query = this.pendingBeneficiaryRepository
      .createQueryBuilder('pending')
      .leftJoinAndSelect('pending.intervention', 'intervention')
      .leftJoin('pending.uploadedBy', 'uploadedBy')
      .addSelect(['uploadedBy.id', 'uploadedBy.email', 'uploadedBy.full_name'])
      .leftJoin('pending.reviewedBy', 'reviewedBy')
      .addSelect(['reviewedBy.id', 'reviewedBy.email', 'reviewedBy.full_name'])
      .orderBy('pending.createdAt', 'DESC');

    if (status) {
      query.andWhere('pending.status = :status', { status });
    }

    if (interventionId) {
      query.andWhere('pending.interventionId = :interventionId', {
        interventionId,
      });
    }

    return await query.getMany();
  }

  async findAllInterventionPending(
    interventionId: string,
  ): Promise<PendingBeneficiaryEntity[]> {
    if (!interventionId) {
      throw new BadRequestException('Intervention ID is required');
    }

    const query = this.pendingBeneficiaryRepository
      .createQueryBuilder('pending')
      .leftJoin('pending.intervention', 'intervention')
      .leftJoin('pending.uploadedBy', 'uploadedBy')
      .addSelect(['uploadedBy.id', 'uploadedBy.email', 'uploadedBy.full_name'])
      .leftJoin('pending.reviewedBy', 'reviewedBy')
      .addSelect(['reviewedBy.id', 'reviewedBy.email', 'reviewedBy.full_name'])
      .orderBy('pending.createdAt', 'DESC');

    query.andWhere('pending.status = :status', {
      status: PendingBeneficiaryStatus.PENDING_REVIEW,
    });
    query.andWhere('pending.interventionId = :interventionId', {
      interventionId,
    });

    return await query.getMany();
  }

  async findOne(id: string): Promise<PendingBeneficiaryEntity> {
    const pending = await this.pendingBeneficiaryRepository
      .createQueryBuilder('pending')
      .leftJoinAndSelect('pending.intervention', 'intervention')
      .leftJoin('pending.uploadedBy', 'uploadedBy')
      .addSelect(['uploadedBy.id', 'uploadedBy.email', 'uploadedBy.full_name'])
      .leftJoin('pending.reviewedBy', 'reviewedBy')
      .addSelect(['reviewedBy.id', 'reviewedBy.email', 'reviewedBy.full_name'])
      .where('pending.id = :id', { id })
      .getOne();

    if (!pending) {
      throw new NotFoundException(
        `Pending beneficiary with ID ${id} not found`,
      );
    }

    return pending;
  }

  async findDuplicatesByNIN(nin: string): Promise<PendingBeneficiaryEntity[]> {
    return await this.pendingBeneficiaryRepository
      .createQueryBuilder('pending')
      .leftJoin('pending.uploadedBy', 'uploadedBy')
      .addSelect(['uploadedBy.id', 'uploadedBy.email', 'uploadedBy.full_name'])
      .leftJoin('pending.reviewedBy', 'reviewedBy')
      .addSelect(['reviewedBy.id', 'reviewedBy.email', 'reviewedBy.full_name'])
      .where("pending.coreData->>'nin' = :nin", { nin })
      .andWhere('pending.status != :status', {
        status: PendingBeneficiaryStatus.REJECTED,
      })
      .getMany();
  }

  async approve(
    id: string,
    dto: ApprovePendingDto,
    userId: string,
  ): Promise<PendingBeneficiaryEntity> {
    const pending = await this.findOne(id);

    if (pending.status !== PendingBeneficiaryStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Cannot approve pending beneficiary with status ${pending.status}`,
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      const beneficiary = await this.beneficiariesService.createOne(
        pending.coreData as Record<string, string>,
        userId,
      );

      const enrollment = await this.enrollmentsService.create({
        beneficiary_id: beneficiary.id,
        intervention_id: pending.interventionId,
        enrollment_date: new Date(),
        customData: pending.customData,
        created_by: userId,
        allocation_amount: Number(pending.coreData.amount),
      });

      pending.status = PendingBeneficiaryStatus.APPROVED;
      pending.approvedBeneficiaryId = beneficiary.id;
      pending.approvedEnrollmentId = enrollment.id;
      pending.reviewedById = userId;
      pending.reviewedAt = new Date();
      if (dto.notes) {
        pending.reviewNotes = dto.notes;
      }

      const savedPending = await manager.save(
        PendingBeneficiaryEntity,
        pending,
      );

      await this.uploadNotificationsService.create({
        interventionId: pending.interventionId,
        type: NotificationType.RECORDS_APPROVED,
        title: 'Records Approved',
        message: `1 beneficiary approved and enrolled`,
        metadata: { approvedCount: 1, beneficiaryId: beneficiary.id },
        createdById: userId,
      });

      return savedPending;
    });
  }

  async reject(
    id: string,
    dto: RejectPendingDto,
    userId: string,
  ): Promise<PendingBeneficiaryEntity> {
    const pending = await this.findOne(id);

    if (pending.status !== PendingBeneficiaryStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Cannot reject pending beneficiary with status ${pending.status}`,
      );
    }

    pending.status = PendingBeneficiaryStatus.REJECTED;
    pending.reviewedById = userId;
    pending.reviewedAt = new Date();
    pending.reviewNotes = dto.reason;

    await this.uploadNotificationsService.create({
      interventionId: pending.interventionId,
      type: NotificationType.RECORDS_REJECTED,
      title: 'Records Rejected',
      message: `1 record rejected: ${dto.reason}`,
      metadata: { rejectedCount: 1, reason: dto.reason },
      createdById: userId,
    });

    return await this.pendingBeneficiaryRepository.save(pending);
  }

  async linkToExisting(
    id: string,
    dto: LinkPendingDto,
    userId: string,
  ): Promise<PendingBeneficiaryEntity> {
    const pending = await this.findOne(id);

    if (pending.status !== PendingBeneficiaryStatus.DUPLICATE) {
      throw new BadRequestException(
        `Can only link pending beneficiaries with Duplicate status`,
      );
    }

    const existingBeneficiary = await this.beneficiariesService.findOne(
      dto.beneficiaryId,
    );

    const existingEnrollment = await this.enrollmentsService.findOne(
      existingBeneficiary.id,
      pending.interventionId,
    );

    if (existingEnrollment) {
      throw new BadRequestException(
        `Beneficiary ${existingBeneficiary.first_name} ${existingBeneficiary.last_name} is already enrolled in this intervention`,
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      const enrollment = await this.enrollmentsService.create({
        beneficiary_id: dto.beneficiaryId,
        intervention_id: pending.interventionId,
        enrollment_date: new Date(),
        customData: pending.customData,
        created_by: userId,
      });

      pending.status = PendingBeneficiaryStatus.APPROVED;
      pending.approvedBeneficiaryId = dto.beneficiaryId;
      pending.approvedEnrollmentId = enrollment.id;
      pending.reviewedById = userId;
      pending.reviewedAt = new Date();
      if (dto.notes) {
        pending.reviewNotes = dto.notes;
      }

      return await manager.save(PendingBeneficiaryEntity, pending);
    });
  }

  async getStatistics(): Promise<{
    total: number;
    pendingReview: number;
    approved: number;
    rejected: number;
    duplicate: number;
  }> {
    const [total, pendingReview, approved, rejected, duplicate] =
      await Promise.all([
        this.pendingBeneficiaryRepository.count(),
        this.pendingBeneficiaryRepository.count({
          where: { status: PendingBeneficiaryStatus.PENDING_REVIEW },
        }),
        this.pendingBeneficiaryRepository.count({
          where: { status: PendingBeneficiaryStatus.APPROVED },
        }),
        this.pendingBeneficiaryRepository.count({
          where: { status: PendingBeneficiaryStatus.REJECTED },
        }),
        this.pendingBeneficiaryRepository.count({
          where: { status: PendingBeneficiaryStatus.DUPLICATE },
        }),
      ]);

    return {
      total,
      pendingReview,
      approved,
      rejected,
      duplicate,
    };
  }

  async bulkApprove(
    pendingIds: string[],
    userId: string,
    notes?: string,
  ): Promise<{
    successful: Array<{
      pendingId: string;
      beneficiaryId: string | null;
      enrollmentId: string | null;
    }>;
    failed: Array<{ pendingId: string; error: string }>;
  }> {
    const successful: Array<{
      pendingId: string;
      beneficiaryId: string | null;
      enrollmentId: string | null;
    }> = [];
    const failed: Array<{ pendingId: string; error: string }> = [];

    for (const pendingId of pendingIds) {
      try {
        const result = await this.approve(pendingId, { notes }, userId);
        successful.push({
          pendingId,
          beneficiaryId: result.approvedBeneficiaryId,
          enrollmentId: result.approvedEnrollmentId,
        });
      } catch (error) {
        failed.push({
          pendingId,
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    }

    return { successful, failed };
  }

  async bulkReject(
    pendingIds: string[],
    userId: string,
    reason: string,
  ): Promise<{
    successful: string[];
    failed: Array<{ pendingId: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ pendingId: string; error: string }> = [];

    for (const pendingId of pendingIds) {
      try {
        await this.reject(pendingId, { reason }, userId);
        successful.push(pendingId);
      } catch (error) {
        failed.push({
          pendingId,
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    }

    return { successful, failed };
  }
}
