import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private emailTransporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Initialize Email transporter
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      host: this.configService.get('SMTP_HOST'),
      // port: this.configService.get('SMTP_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  /**
   * Send OTP via Email
   */
  async sendOtpEmail(email: string, code: string): Promise<void> {
    try {
      await this.emailTransporter.sendMail({
        from: this.configService.get('SMTP_FROM_EMAIL'),
        to: email,
        subject: 'Your KADSIPA Verification Code',
        html: `
            KADSIPA Verification Code
            Your verification code is:
            ${code}
            This code will expire in 10 minutes.
            If you didn't request this code, please ignore this email.
        `,
      });

      this.logger.log(`OTP Email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email: ${error instanceof Error ? error.message : String(error)}`,
      );
      // In development, just log the OTP
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.log(`[DEV] OTP Code for ${email}: ${code}`);
      }
    }
  }
}
