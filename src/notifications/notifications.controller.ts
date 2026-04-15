import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { successResponse } from '@/common';
import { PassportJwtGuard } from '@/auth/guards/passport-jwt.guard';
import { QueueFailureLog } from './schemas/queue-failure-log.schema';

@Controller({ version: '1', path: 'notifications' })
@UseGuards(PassportJwtGuard)
export class NotificationsController {
  constructor(
    @InjectModel(QueueFailureLog.name)
    private queueFailureLogModel: Model<QueueFailureLog>,
  ) {}

  @Get('queue-failures')
  async getQueueFailures(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('queueName') queueName?: string,
  ) {
    const limitNum = parseInt(limit || '50', 10);
    const skipNum = parseInt(skip || '0', 10);

    const query = queueName ? { queueName } : {};

    const [failures, total] = await Promise.all([
      this.queueFailureLogModel
        .find(query)
        .sort({ failedAt: -1 })
        .limit(limitNum)
        .skip(skipNum)
        .lean()
        .exec(),
      this.queueFailureLogModel.countDocuments(query),
    ]);

    return successResponse('Queue failures retrieved successfully', {
      failures,
      pagination: {
        total,
        limit: limitNum,
        skip: skipNum,
        hasMore: total > skipNum + limitNum,
      },
    });
  }
}
