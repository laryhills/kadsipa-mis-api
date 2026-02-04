import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { QueryAuditLogDto } from '../dto/query-audit-log.dto';
import { AuditAction, AuditStatus } from '../constants/audit-action.enum';
import { calculateDiff, sanitizeValues } from '../utils/diff.util';

export interface CreateAuditLogData {
  userId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status?: AuditStatus;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  async create(data: CreateAuditLogData): Promise<AuditLogEntity> {
    const sanitizedOldValues = sanitizeValues(data.oldValues);
    const sanitizedNewValues = sanitizeValues(data.newValues);

    const changesDiff =
      data.oldValues && data.newValues
        ? calculateDiff(sanitizedOldValues, sanitizedNewValues)
        : null;

    const auditLog = this.auditLogRepository.create({
      user_id: data.userId,
      action: data.action,
      resource_type: data.resourceType,
      resource_id: data.resourceId,
      old_values: sanitizedOldValues,
      new_values: sanitizedNewValues,
      changes_diff: changesDiff,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      status: data.status || AuditStatus.SUCCESS,
    });

    return await this.auditLogRepository.save(auditLog);
  }

  async findAll(query: QueryAuditLogDto) {
    const {
      user_id,
      action,
      resource_type,
      resource_id,
      status,
      start_date,
      end_date,
      page = 1,
      limit = 50,
    } = query;

    const where: FindOptionsWhere<AuditLogEntity> = {};

    if (user_id) where.user_id = user_id;
    if (action) where.action = action;
    if (resource_type) where.resource_type = resource_type;
    if (resource_id) where.resource_id = resource_id;
    if (status) where.status = status;

    if (start_date && end_date) {
      where.created_at = Between(new Date(start_date), new Date(end_date));
    } else if (start_date) {
      where.created_at = Between(new Date(start_date), new Date());
    }

    const [data, total] = await this.auditLogRepository.findAndCount({
      where,
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<AuditLogEntity | null> {
    return await this.auditLogRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findByResourceId(
    resourceType: string,
    resourceId: string,
  ): Promise<AuditLogEntity[]> {
    return await this.auditLogRepository.find({
      where: { resource_type: resourceType, resource_id: resourceId },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async findByUserId(userId: string): Promise<AuditLogEntity[]> {
    return await this.auditLogRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 100,
    });
  }
}
