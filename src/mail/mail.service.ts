import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: Transporter;
  private readonly logger = new Logger(MailService.name);
  private readonly sendEmails: boolean;

  constructor(private readonly configService: ConfigService) {
    this.sendEmails = this.configService.get<string>('SEND_EMAILS') === 'true';

    if (this.sendEmails) {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST'),
        port: this.configService.get<number>('SMTP_PORT'),
        secure: false,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    } else {
      this.logger.warn(
        'Email sending is disabled. Set SEND_EMAILS=true to enable.',
      );
    }
  }

  async sendUserInvitation(
    email: string,
    fullName: string,
    temporaryPassword: string,
    personalMessage?: string,
  ): Promise<void> {
    if (!this.sendEmails) {
      this.logger.log(
        `Email sending disabled. Would have sent invitation to ${email}`,
      );
      this.logger.log(`Temporary password: ${temporaryPassword}`);
      return;
    }

    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL');
    const appUrl = this.configService.get<string>(
      'FRONTEND_APP_URL',
      'http://localhost:5183',
    );

    const htmlContent = this.generateInvitationEmailHtml(
      fullName,
      temporaryPassword,
      appUrl,
      personalMessage,
    );

    try {
      await this.transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: 'Welcome to KADSIPA MIS - Your Account Has Been Created',
        html: htmlContent,
      });

      this.logger.log(`Invitation email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${email}`, error);
      throw new Error('Failed to send invitation email');
    }
  }

  private generateInvitationEmailHtml(
    fullName: string,
    temporaryPassword: string,
    appUrl: string,
    personalMessage?: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to KADSIPA MIS</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #374151;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background-color: #556938;
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 16px;
    }
    .message {
      margin-bottom: 24px;
      color: #6b7280;
      line-height: 1.6;
    }
    .personal-message {
      background-color: #f3f4f6;
      border-left: 4px solid #556938;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .personal-message p {
      margin: 0;
      color: #374151;
      font-style: italic;
    }
    .credentials-box {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .credentials-box h3 {
      margin: 0 0 16px 0;
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .credential-item {
      margin-bottom: 12px;
    }
    .credential-label {
      font-size: 12px;
      font-weight: 500;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .credential-value {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      font-family: 'Courier New', monospace;
      background-color: #ffffff;
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid #d1d5db;
    }
    .button {
      display: inline-block;
      background-color: #556938;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      margin: 24px 0;
      text-align: center;
    }
    .button:hover {
      background-color: #445528;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .warning p {
      margin: 0;
      color: #92400e;
      font-size: 14px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 0;
      font-size: 12px;
      color: #6b7280;
    }
    .steps {
      margin: 24px 0;
    }
    .step {
      display: flex;
      margin-bottom: 16px;
    }
    .step-number {
      background-color: #556938;
      color: #ffffff;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .step-content {
      flex: 1;
      padding-top: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to KADSIPA MIS</h1>
    </div>
    
    <div class="content">
      <div class="greeting">Hello ${fullName},</div>
      
      <p class="message">
        You have been invited to join the Kaduna State Social Investment Protection Agency (KADSIPA) 
        Management Information System. Your account has been created and you can now access the platform.
      </p>

      ${
        personalMessage
          ? `
      <div class="personal-message">
        <p>${personalMessage}</p>
      </div>
      `
          : ''
      }

      <div class="credentials-box">
        <h3>Your Login Credentials</h3>
        <div class="credential-item">
          <div class="credential-label">Temporary Password</div>
          <div class="credential-value">${temporaryPassword}</div>
        </div>
      </div>

      <div class="warning">
        <p>
          <strong>⚠️ Important:</strong> This is a temporary password. You will be required to change 
          it upon your first login for security purposes.
        </p>
      </div>

      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            Click the button below to access the KADSIPA MIS platform
          </div>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            Log in using your email address and the temporary password provided above
          </div>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            Follow the prompts to create a new secure password
          </div>
        </div>
      </div>

      <center>
        <a href="${appUrl}/login" class="button" style="color: #ffffff !important;">Access KADSIPA MIS</a>
      </center>

      <p class="message" style="margin-top: 32px;">
        If you have any questions or need assistance, please contact the system administrator.
      </p>
    </div>

    <div class="footer">
      <p>
        © ${new Date().getFullYear()} Kaduna State Social Investment Protection Agency (KADSIPA)<br>
        This is an automated message, please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
