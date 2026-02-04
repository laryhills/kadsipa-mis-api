import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { ActivityLogEntity } from '../entities/activity-log.entity';
import { QueryActivityLogDto } from '../dto/query-activity-log.dto';
import { ActivityType } from '../constants/audit-action.enum';

export interface CreateActivityLogData {
  userId?: string;
  activityType: ActivityType;
  description: string;
  logDetails?: Record<string, any>;
  ipAddress?: string;
}

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectRepository(ActivityLogEntity)
    private readonly activityLogRepository: Repository<ActivityLogEntity>,
  ) {}

  async create(data: CreateActivityLogData): Promise<ActivityLogEntity> {
    const activityLog = this.activityLogRepository.create({
      user_id: data.userId,
      activity_type: data.activityType,
      description: data.description,
      log_details: data.logDetails,
      ip_address: data.ipAddress,
    });

    return await this.activityLogRepository.save(activityLog);
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

    const where: FindOptionsWhere<ActivityLogEntity> = {};

    if (user_id) where.user_id = user_id;
    if (activity_type) where.activity_type = activity_type;

    if (start_date && end_date) {
      where.created_at = Between(new Date(start_date), new Date(end_date));
    } else if (start_date) {
      where.created_at = Between(new Date(start_date), new Date());
    }

    const [data, total] = await this.activityLogRepository.findAndCount({
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

  async findOne(id: string): Promise<ActivityLogEntity | null> {
    return await this.activityLogRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<ActivityLogEntity[]> {
    return await this.activityLogRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 100,
    });
  }
}
