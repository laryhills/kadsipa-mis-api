import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  EMAIL_QUEUE,
  SendOtpEmailJob,
  EmailJobType,
} from '../queues/email.queue';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private emailTransporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    super();

    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      host: this.configService.get('SMTP_HOST'),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async process(job: Job<SendOtpEmailJob, void, EmailJobType>): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case EmailJobType.SEND_OTP:
        await this.sendOtpEmail(job.data);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name as string}`);
    }
  }

  private async sendOtpEmail(data: SendOtpEmailJob): Promise<void> {
    try {
      if (process.env.SEND_EMAILS === 'false') {
        this.logger.log(`[DEV] OTP Code for ${data.email}: ${data.code}`);
        return;
      }
      await this.emailTransporter.sendMail({
        from:
          this.configService.get('SMTP_FROM_EMAIL') ||
          this.configService.get('SMTP_USER'),
        to:
          process.env.NODE_ENV === 'production'
            ? data.email
            : process.env.TEST_EMAIL,
        subject: 'Your KADSIPA Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>KADSIPA Verification Code</h2>
            <p>Your verification code is:</p>
            <h1 style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px;">
              ${data.code}
            </h1>
            <p>This code will expire in 10 minutes.</p>
            <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });

      this.logger.log(`OTP Email sent successfully to ${data.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${data.email}: ${error instanceof Error ? error.message : String(error)}`,
      );

      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.log(`[DEV] OTP Code for ${data.email}: ${data.code}`);
      }

      throw error;
    }
  }
}
