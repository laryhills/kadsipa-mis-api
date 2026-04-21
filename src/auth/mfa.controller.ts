import type { RequestWithUser } from '@/auth/auth.controller';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { successResponse } from '@/common';
import { PassportJwtGuard } from './guards/passport-jwt.guard';
import { Audit } from '@/audit/decorators/audit.decorator';
import { ActivityType } from '@/audit/constants/audit-action.enum';
import { MfaService } from './mfa.service';
import {
  MfaChallengeBodyDto,
  MfaEmailBackupVerifyDto,
  MfaTotpConfirmDto,
  MfaTotpDisableDto,
  MfaVerifyRecoveryDto,
  MfaVerifyTotpDto,
  PatchMfaEmailBackupDto,
} from './dto/mfa.dto';

@Controller({ version: '1', path: 'auth/mfa' })
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Get('status')
  @UseGuards(PassportJwtGuard)
  async status(@Req() req: RequestWithUser) {
    const data = await this.mfaService.getMfaStatusForUser(req.user.id);
    return successResponse('MFA status', data);
  }

  @HttpCode(HttpStatus.OK)
  @Post('totp/setup')
  @UseGuards(PassportJwtGuard)
  @Audit(ActivityType.AUTH, 'User started MFA TOTP setup')
  async totpSetup(@Req() req: RequestWithUser) {
    const data = await this.mfaService.prepareTotpSetup(req.user.id);
    return successResponse('Scan the QR code or enter the secret', data);
  }

  @HttpCode(HttpStatus.OK)
  @Post('totp/confirm')
  @UseGuards(PassportJwtGuard)
  @Audit(ActivityType.AUTH, 'User confirmed MFA TOTP')
  async totpConfirm(
    @Req() req: RequestWithUser,
    @Body() dto: MfaTotpConfirmDto,
  ) {
    const recoveryCodes = await this.mfaService.confirmTotp(req.user.id, dto);
    return successResponse(
      'TOTP enabled. Store these recovery codes securely — they will not be shown again.',
      { recoveryCodes },
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('totp/disable')
  @UseGuards(PassportJwtGuard)
  @Audit(ActivityType.AUTH, 'User disabled MFA TOTP')
  async totpDisable(
    @Req() req: RequestWithUser,
    @Body() dto: MfaTotpDisableDto,
  ) {
    await this.mfaService.disableTotp(req.user.id, dto);
    return successResponse('TOTP has been disabled', null);
  }

  @HttpCode(HttpStatus.OK)
  @Post('recovery/regenerate')
  @UseGuards(PassportJwtGuard)
  @Audit(ActivityType.AUTH, 'User regenerated MFA recovery codes')
  async recoveryRegenerate(@Req() req: RequestWithUser) {
    const recoveryCodes = await this.mfaService.regenerateRecoveryCodes(
      req.user.id,
    );
    return successResponse(
      'New recovery codes generated. Store them securely — they will not be shown again.',
      { recoveryCodes },
    );
  }

  @Patch('email-backup')
  @UseGuards(PassportJwtGuard)
  @Audit(ActivityType.AUTH, 'User updated MFA email backup preference')
  async emailBackup(
    @Req() req: RequestWithUser,
    @Body() dto: PatchMfaEmailBackupDto,
  ) {
    await this.mfaService.patchEmailBackup(req.user.id, dto);
    return successResponse('Email backup preference updated', {
      emailBackupEnabled: dto.enabled,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('login/verify-totp')
  @Audit(ActivityType.AUTH, 'User completed MFA login with TOTP')
  async verifyTotp(
    @Body() dto: MfaVerifyTotpDto,
    @Req() req: ExpressRequest,
    @Ip() ip: string,
  ) {
    const data = await this.mfaService.verifyLoginTotp(dto, req, ip);
    return successResponse('Login successful', data);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login/verify-recovery')
  @Audit(ActivityType.AUTH, 'User completed MFA login with recovery code')
  async verifyRecovery(
    @Body() dto: MfaVerifyRecoveryDto,
    @Req() req: ExpressRequest,
    @Ip() ip: string,
  ) {
    const data = await this.mfaService.verifyLoginRecovery(dto, req, ip);
    return successResponse('Login successful', data);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login/email-backup/send')
  @Audit(ActivityType.AUTH, 'User requested MFA email backup OTP')
  async emailBackupSend(@Body() dto: MfaChallengeBodyDto) {
    const result = await this.mfaService.sendLoginEmailBackup(
      dto.mfaChallengeToken,
    );
    return successResponse(result.message, {
      expiresIn: result.expiresIn,
      attemptsRemaining: result.attemptsRemaining,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('login/email-backup/verify')
  @Audit(ActivityType.AUTH, 'User completed MFA login with email backup OTP')
  async emailBackupVerify(
    @Body() dto: MfaEmailBackupVerifyDto,
    @Req() req: ExpressRequest,
    @Ip() ip: string,
  ) {
    const data = await this.mfaService.verifyLoginEmailBackup(dto, req, ip);
    return successResponse('Login successful', data);
  }
}
