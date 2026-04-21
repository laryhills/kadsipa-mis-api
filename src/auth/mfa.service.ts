import { AuthService } from '@/auth/auth.service';
import { MFA_LOGIN_JWT_PURPOSE } from '@/auth/constants/mfa-jwt.constants';
import { UserMfaRecoveryCodeEntity } from '@/auth/entities/user-mfa-recovery-code.entity';
import { OtpType } from '@/auth/entities/otp.entity';
import { OtpService } from '@/auth/services/otp.service';
import { RateLimiterService } from '@/auth/services/rate-limiter.service';
import {
  MfaEmailBackupVerifyDto,
  MfaTotpConfirmDto,
  MfaTotpDisableDto,
  MfaVerifyRecoveryDto,
  MfaVerifyTotpDto,
  PatchMfaEmailBackupDto,
} from '@/auth/dto/mfa.dto';
import { NotificationService } from '@/notifications/notifications.service';
import { UserEntity } from '@/users/entities/user.entity';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { authenticator } from 'otplib';
import { Repository, IsNull } from 'typeorm';
import * as crypto from 'crypto';
import { Request as ExpressRequest } from 'express';
import { comparePassword } from '@/common/utils/hash.util';
import { TooManyRequestsException } from '@/common/exceptions/too-many-requests.exception';

authenticator.options = { window: 1 };

const RECOVERY_CODE_COUNT = 10;

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserMfaRecoveryCodeEntity)
    private readonly recoveryRepository: Repository<UserMfaRecoveryCodeEntity>,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly notificationService: NotificationService,
    private readonly rateLimiterService: RateLimiterService,
  ) {}

  private recoveryPepper(): string {
    return (
      process.env.MFA_RECOVERY_PEPPER ?? process.env.JWT_SECRET ?? 'dev-pepper'
    );
  }

  private hashRecoveryCode(normalized: string): string {
    return crypto
      .createHash('sha256')
      .update(`${this.recoveryPepper()}:${normalized}`)
      .digest('hex');
  }

  private normalizeRecoveryCodeInput(raw: string): string {
    return raw.replace(/-/g, '').trim().toUpperCase();
  }

  private generatePlainRecoveryCodes(): string[] {
    const out: string[] = [];
    for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
      const p1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const p2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      out.push(`${p1}-${p2}`);
    }
    return out;
  }

  private async saveRecoveryCodeHashes(
    userId: string,
    plains: string[],
  ): Promise<void> {
    await this.recoveryRepository.delete({ userId });
    const rows = plains.map((plain) =>
      this.recoveryRepository.create({
        userId,
        codeHash: this.hashRecoveryCode(this.normalizeRecoveryCodeInput(plain)),
      }),
    );
    await this.recoveryRepository.save(rows);
  }

  async signMfaChallengeToken(userId: string, email: string): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        email,
        purpose: MFA_LOGIN_JWT_PURPOSE,
      },
      { expiresIn: '10m' },
    );
  }

  private async verifyMfaChallengeToken(
    token: string,
  ): Promise<{ userId: string; email: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        purpose?: string;
      }>(token);
      if (payload.purpose !== MFA_LOGIN_JWT_PURPOSE) {
        throw new UnauthorizedException('Invalid MFA challenge');
      }
      return { userId: payload.sub, email: payload.email };
    } catch (e) {
      this.logger.warn(`MFA challenge JWT invalid: ${String(e)}`);
      throw new UnauthorizedException('Invalid or expired MFA challenge');
    }
  }

  async getMfaStatusForUser(userId: string): Promise<{
    totpEnabled: boolean;
    emailBackupEnabled: boolean;
    recoveryCodesRemaining: number;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const recoveryCodesRemaining = await this.recoveryRepository.count({
      where: { userId, usedAt: IsNull() },
    });
    return {
      totpEnabled: user.mfa_totp_enabled,
      emailBackupEnabled: user.mfa_email_backup_enabled,
      recoveryCodesRemaining,
    };
  }

  async prepareTotpSetup(userId: string): Promise<{
    secret: string;
    otpauthUrl: string;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.mfa_totp_enabled) {
      throw new BadRequestException('TOTP is already enabled');
    }

    const secret = authenticator.generateSecret();
    user.mfa_secret = secret;
    await this.userRepository.save(user);

    const otpauthUrl = authenticator.keyuri(user.email, 'KADSIPA MIS', secret);

    return { secret, otpauthUrl };
  }

  async confirmTotp(userId: string, dto: MfaTotpConfirmDto): Promise<string[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.mfa_secret) {
      throw new BadRequestException('Start TOTP setup first');
    }
    if (user.mfa_totp_enabled) {
      throw new BadRequestException('TOTP is already enabled');
    }

    const ok = authenticator.verify({
      token: dto.code,
      secret: user.mfa_secret,
    });
    if (!ok) {
      this.logger.warn(`TOTP confirm failed for user ${userId}`);
      throw new BadRequestException('Invalid authenticator code');
    }

    user.mfa_totp_enabled = true;
    await this.userRepository.save(user);

    const plains = this.generatePlainRecoveryCodes();
    await this.saveRecoveryCodeHashes(userId, plains);
    return plains;
  }

  async disableTotp(userId: string, dto: MfaTotpDisableDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.mfa_totp_enabled) {
      throw new BadRequestException('TOTP is not enabled');
    }

    const passwordOk = await comparePassword(
      dto.currentPassword,
      user.password,
    );
    if (!passwordOk) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hasTotp = Boolean(dto.totpCode?.trim());
    const hasRecovery = Boolean(dto.recoveryCode?.trim());
    if (hasTotp === hasRecovery) {
      throw new BadRequestException(
        'Provide exactly one of totpCode or recoveryCode',
      );
    }

    if (dto.totpCode) {
      const totpOk = authenticator.verify({
        token: dto.totpCode,
        secret: user.mfa_secret ?? '',
      });
      if (!totpOk) {
        this.logger.warn(`TOTP disable: bad code for user ${userId}`);
        throw new BadRequestException('Invalid authenticator code');
      }
    } else if (dto.recoveryCode) {
      await this.consumeRecoveryCode(userId, dto.recoveryCode);
    }

    user.mfa_secret = null;
    user.mfa_totp_enabled = false;
    user.mfa_email_backup_enabled = false;
    await this.userRepository.save(user);
    await this.recoveryRepository.delete({ userId });
  }

  private async consumeRecoveryCode(
    userId: string,
    rawCode: string,
  ): Promise<void> {
    const normalized = this.normalizeRecoveryCodeInput(rawCode);
    const rows = await this.recoveryRepository.find({
      where: { userId, usedAt: IsNull() },
    });

    const targetHash = this.hashRecoveryCode(normalized);
    const bufTarget = Buffer.from(targetHash, 'hex');

    for (const row of rows) {
      const bufRow = Buffer.from(row.codeHash, 'hex');
      if (
        bufTarget.length === bufRow.length &&
        crypto.timingSafeEqual(bufTarget, bufRow)
      ) {
        row.usedAt = new Date();
        await this.recoveryRepository.save(row);
        return;
      }
    }

    this.logger.warn(`Recovery code mismatch for user ${userId}`);
    throw new BadRequestException('Invalid recovery code');
  }

  async regenerateRecoveryCodes(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.mfa_totp_enabled) {
      throw new BadRequestException('TOTP must be enabled first');
    }

    const plains = this.generatePlainRecoveryCodes();
    await this.saveRecoveryCodeHashes(userId, plains);
    return plains;
  }

  async patchEmailBackup(
    userId: string,
    dto: PatchMfaEmailBackupDto,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (dto.enabled && !user.mfa_totp_enabled) {
      throw new BadRequestException(
        'Enable TOTP before turning on email backup',
      );
    }
    user.mfa_email_backup_enabled = dto.enabled;
    await this.userRepository.save(user);
  }

  async verifyLoginTotp(
    dto: MfaVerifyTotpDto,
    req: ExpressRequest,
    ip: string,
  ) {
    const { userId, email } = await this.verifyMfaChallengeToken(
      dto.mfaChallengeToken,
    );
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (
      !user ||
      user.email !== email ||
      !user.mfa_totp_enabled ||
      !user.mfa_secret
    ) {
      throw new UnauthorizedException('Invalid MFA state');
    }

    const ok = authenticator.verify({
      token: dto.code,
      secret: user.mfa_secret,
    });
    if (!ok) {
      this.logger.warn(`MFA login TOTP failed for user ${userId}`);
      throw new UnauthorizedException('Invalid authenticator code');
    }

    return this.authService.issueLoginSuccessData(userId, req, ip);
  }

  async verifyLoginRecovery(
    dto: MfaVerifyRecoveryDto,
    req: ExpressRequest,
    ip: string,
  ) {
    const { userId, email } = await this.verifyMfaChallengeToken(
      dto.mfaChallengeToken,
    );
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.email !== email || !user.mfa_totp_enabled) {
      throw new UnauthorizedException('Invalid MFA state');
    }

    await this.consumeRecoveryCode(userId, dto.code);

    return this.authService.issueLoginSuccessData(userId, req, ip);
  }

  async sendLoginEmailBackup(mfaChallengeToken: string) {
    const { userId, email } =
      await this.verifyMfaChallengeToken(mfaChallengeToken);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (
      !user ||
      user.email !== email ||
      !user.mfa_totp_enabled ||
      !user.mfa_email_backup_enabled
    ) {
      throw new BadRequestException('Email backup is not available');
    }

    const rate = await this.rateLimiterService.checkMfaEmailBackupRateLimit(
      user.email,
    );
    if (!rate.allowed) {
      throw new TooManyRequestsException(
        `Too many email requests. Try again after ${rate.resetAt.toLocaleTimeString()}`,
      );
    }

    const otp = await this.otpService.createOtp(
      user.id,
      OtpType.MFA_LOGIN_EMAIL_BACKUP,
    );
    await this.notificationService.sendOtpEmail(user.email, otp.code);

    const message =
      process.env.NODE_ENV === 'production'
        ? 'OTP sent to your email'
        : `OTP sent [${otp.code}]`;
    return {
      message,
      attemptsRemaining: rate.remaining,
      expiresIn: '10 minutes',
    };
  }

  async verifyLoginEmailBackup(
    dto: MfaEmailBackupVerifyDto,
    req: ExpressRequest,
    ip: string,
  ) {
    const { userId, email } = await this.verifyMfaChallengeToken(
      dto.mfaChallengeToken,
    );
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (
      !user ||
      user.email !== email ||
      !user.mfa_totp_enabled ||
      !user.mfa_email_backup_enabled
    ) {
      throw new UnauthorizedException('Invalid MFA state');
    }

    await this.otpService.verifyOtp(
      user.id,
      dto.code,
      OtpType.MFA_LOGIN_EMAIL_BACKUP,
    );

    return this.authService.issueLoginSuccessData(userId, req, ip);
  }
}
