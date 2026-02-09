import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { OtpEntity, OtpType } from '../entities/otp.entity';
import * as crypto from 'crypto';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpEntity)
    private otpRepository: Repository<OtpEntity>,
  ) {}

  /**
   * Generate a 6-digit OTP code
   */
  private generateOtpCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Create and save OTP
   */
  async createOtp(
    userId: string,
    type: OtpType = OtpType.LOGIN,
  ): Promise<OtpEntity> {
    // Invalidate previous unused OTPs
    await this.otpRepository.update(
      {
        userId,
        type,
        isUsed: false,
      },
      {
        isUsed: true,
      },
    );

    // Generate new OTP
    const code = this.generateOtpCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    const otp = this.otpRepository.create({
      userId,
      code,
      type,
      expiresAt,
    });

    return await this.otpRepository.save(otp);
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(
    userId: string,
    code: string,
    type: OtpType = OtpType.LOGIN,
  ): Promise<boolean> {
    const otp = await this.otpRepository.findOne({
      where: {
        userId,
        code,
        type,
        isUsed: false,
      },
    });

    if (!otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Check if OTP has expired
    if (new Date() > otp.expiresAt) {
      throw new BadRequestException('OTP has expired');
    }

    // Check attempt limit (max 5 attempts)
    if (otp.attempts >= 5) {
      throw new BadRequestException('Too many attempts. Request a new OTP');
    }

    // Increment attempts
    await this.otpRepository.update(otp.id, {
      attempts: otp.attempts + 1,
    });

    // Mark as used
    await this.otpRepository.update(otp.id, {
      isUsed: true,
      usedAt: new Date(),
    });

    return true;
  }

  /**
   * Clean up expired OTPs (run this as a cron job)
   */
  async cleanupExpiredOtps(): Promise<void> {
    await this.otpRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  /**
   * Get valid OTP for user (for testing/development)
   */
  async getValidOtp(userId: string, type: OtpType): Promise<string | null> {
    const otp = await this.otpRepository.findOne({
      where: {
        userId,
        type,
        isUsed: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!otp || new Date() > otp.expiresAt) {
      return null;
    }

    return otp.code;
  }
}
