import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from '../schemas/audit-log.schema';
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

interface AuditLogFilter {
  userId?: string;
  action?: AuditAction;
  resourceType?: string;
  resourceId?: string;
  status?: AuditStatus;
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLog>,
  ) {}

  async create(data: CreateAuditLogData): Promise<any> {
    const sanitizedOldValues = sanitizeValues(data.oldValues);
    const sanitizedNewValues = sanitizeValues(data.newValues);

    const changesDiff =
      data.oldValues && data.newValues
        ? calculateDiff(sanitizedOldValues, sanitizedNewValues)
        : null;

    const auditLog = new this.auditLogModel({
      userId: data.userId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      oldValues: sanitizedOldValues,
      newValues: sanitizedNewValues,
      changesDiff: changesDiff,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      status: data.status || AuditStatus.SUCCESS,
    });

    return await auditLog.save();
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

    const filter: AuditLogFilter = {};

    if (user_id) filter.userId = user_id;
    if (action) filter.action = action;
    if (resource_type) filter.resourceType = resource_type;
    if (resource_id) filter.resourceId = resource_id;
    if (status) filter.status = status;

    if (start_date && end_date) {
      filter.createdAt = {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      };
    } else if (start_date) {
      filter.createdAt = {
        $gte: new Date(start_date),
        $lte: new Date(),
      };
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

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

  async findOne(id: string): Promise<AuditLog | null> {
    return await this.auditLogModel.findById(id).lean().exec();
  }

  async findByResourceId(
    resourceType: string,
    resourceId: string,
  ): Promise<any[]> {
    return await this.auditLogModel
      .find({ resourceType, resourceId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findByUserId(userId: string): Promise<any[]> {
    return await this.auditLogModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
  }
}
