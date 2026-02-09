import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  EMAIL_QUEUE,
  SendOtpEmailJob,
  EmailJobType,
} from './queues/email.queue';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectQueue(EMAIL_QUEUE) private emailQueue: Queue<SendOtpEmailJob>,
  ) {}

  async sendOtpEmail(email: string, code: string): Promise<void> {
    try {
      await this.emailQueue.add(
        EmailJobType.SEND_OTP,
        { email, code },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      this.logger.log(`OTP email job queued for ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue email: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
