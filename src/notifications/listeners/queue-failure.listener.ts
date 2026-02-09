import { Injectable, Logger } from '@nestjs/common';
import {
  OnQueueEvent,
  QueueEventsHost,
  QueueEventsListener,
} from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EMAIL_QUEUE } from '../queues/email.queue';
import { QueueFailureLog } from '../schemas/queue-failure-log.schema';

@Injectable()
@QueueEventsListener(EMAIL_QUEUE)
export class QueueFailureLogger extends QueueEventsHost {
  private readonly logger = new Logger(QueueFailureLogger.name);

  constructor(
    @InjectModel(QueueFailureLog.name)
    private queueFailureLogModel: Model<QueueFailureLog>,
    @InjectQueue(EMAIL_QUEUE) private emailQueue: Queue,
  ) {
    super();
  }

  @OnQueueEvent('failed')
  async onFailed({
    jobId,
    failedReason,
  }: {
    jobId: string;
    failedReason: string;
  }) {
    try {
      const job = await this.emailQueue.getJob(jobId);

      if (!job) {
        this.logger.warn(`Job ${jobId} not found, cannot log failure`);
        return;
      }

      const failureLog = new this.queueFailureLogModel({
        jobId: job.id,
        queueName: EMAIL_QUEUE,
        jobName: job.name,
        jobData: job.data as Record<string, any>,
        errorMessage: failedReason,
        errorStack: job.stacktrace?.join('\n') || '',
        attemptsMade: job.attemptsMade,
        failedAt: new Date(),
        status: 'failed',
        metadata: {
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          timestamp: job.timestamp,
        },
      });

      await failureLog.save();

      this.logger.error(
        `Job ${jobId} failed and logged to MongoDB. Reason: ${failedReason}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log queue failure to MongoDB: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @OnQueueEvent('completed')
  onCompleted({ jobId }: { jobId: string }) {
    this.logger.log(`Job ${jobId} completed successfully and auto-removed`);
  }
}
