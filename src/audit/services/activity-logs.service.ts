import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActivityLog } from '../schemas/activity-log.schema';
import { QueryActivityLogDto } from '../dto/query-activity-log.dto';
import { ActivityType } from '../constants/audit-action.enum';

export interface CreateActivityLogData {
  userId?: string;
  activityType: ActivityType;
  description: string;
  logDetails?: Record<string, any>;
  ipAddress?: string;
}

interface ActivityLogFilter {
  userId?: string;
  activityType?: ActivityType;
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
}
@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLog>,
  ) {}

  async create(data: CreateActivityLogData): Promise<any> {
    const activityLog = new this.activityLogModel({
      userId: data.userId,
      activityType: data.activityType,
      description: data.description,
      logDetails: data.logDetails,
      ipAddress: data.ipAddress,
    });

    return await activityLog.save();
  }

  async findAll(query: QueryActivityLogDto) {
    const {
      user_id,
      activity_type,
      start_date,
      end_date,
      page = 1,
      limit = 50,
    } = query;

    const filter: ActivityLogFilter = {};

    if (user_id) filter.userId = user_id;
    if (activity_type) filter.activityType = activity_type;

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
      this.activityLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.activityLogModel.countDocuments(filter).exec(),
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

  async findOne(id: string): Promise<ActivityLog | null> {
    return await this.activityLogModel.findById(id).lean().exec();
  }

  async findByUserId(userId: string): Promise<any[]> {
    return await this.activityLogModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
  }
}
