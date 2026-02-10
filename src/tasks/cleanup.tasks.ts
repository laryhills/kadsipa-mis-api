import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OtpService } from '@/auth/services/otp.service';
import { RefreshTokenService } from '@/auth/services/refresh-token.service';

@Injectable()
export class CleanupTasks {
  private readonly logger = new Logger(CleanupTasks.name);

  constructor(
    private readonly otpService: OtpService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupUsedOtps() {
    this.logger.log('Running cleanup for used/expired OTPs');
    try {
      await this.otpService.cleanupExpiredOtps();
      this.logger.log('Successfully cleaned up OTPs');
    } catch (error) {
      this.logger.error(
        `Failed to cleanup OTPs: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredRefreshTokens() {
    this.logger.log('Running cleanup for expired refresh tokens');
    try {
      await this.refreshTokenService.cleanupExpiredTokens();
      this.logger.log('Successfully cleaned up expired refresh tokens');
    } catch (error) {
      this.logger.error(
        `Failed to cleanup refresh tokens: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
