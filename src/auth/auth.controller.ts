import { AuthService, type LoginData } from '@/auth/auth.service';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { successResponse } from '@/common';
import { PassportJwtGuard } from './guards/passport-jwt.guard';
import { Audit } from '@/audit/decorators/audit.decorator';
import { ActivityType } from '@/audit/constants/audit-action.enum';
import { NotificationService } from '@/notifications/notifications.service';
import { OtpService } from './services/otp.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { LoginDto, VerifyOtpDto, ResendOtpDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RevokeOthersSessionsDto } from './dto/revoke-sessions.dto';
import { OtpType } from './entities/otp.entity';
import { UsersService } from '@/users/users.service';
import { UserStatus } from '@/users/entities/user.entity';
import { TooManyRequestsException } from '@/common/exceptions/too-many-requests.exception';
import { MfaService } from './mfa.service';

function maskEmailForLogin(email: string): string {
  const at = email.indexOf('@');
  if (at < 1) {
    return '***';
  }
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length <= 1) {
    return `*@${domain}`;
  }
  return `${local[0]}***@${domain}`;
}

export type RequestWithUser = ExpressRequest & { user: LoginData };

@Controller({ version: '1', path: 'auth' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly notificationService: NotificationService,
    private readonly otpService: OtpService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly rateLimiterService: RateLimiterService,
    private readonly mfaService: MfaService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @Audit(ActivityType.AUTH, 'User validated password for login')
  async requestOtp(@Body() loginDto: LoginDto) {
    const rateLimit = await this.rateLimiterService.checkOtpRateLimit(
      loginDto.email,
    );

    if (!rateLimit.allowed) {
      throw new TooManyRequestsException(
        `Too many OTP requests. Please try again after ${rateLimit.resetAt.toLocaleTimeString()}`,
      );
    }

    const user = await this.authService.validateUser(loginDto);
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const userRecord = await this.usersService.findOneByEmail(loginDto.email);
    if (!userRecord) {
      throw new BadRequestException('Invalid credentials');
    }

    if (userRecord.mfa_totp_enabled) {
      const mfaChallengeToken = await this.mfaService.signMfaChallengeToken(
        userRecord.id,
        userRecord.email,
      );
      return successResponse('Complete sign-in with your authenticator app', {
        step: 'mfa_totp' as const,
        mfaChallengeToken,
        maskedEmail: maskEmailForLogin(userRecord.email),
        emailBackupEnabled: userRecord.mfa_email_backup_enabled,
      });
    }

    const otp = await this.otpService.createOtp(user.id, OtpType.LOGIN);

    await this.notificationService.sendOtpEmail(user.email, otp.code);

    const message =
      process.env.NODE_ENV === 'production'
        ? 'OTP sent successfully to your email'
        : `OTP sent successfully to your email [${otp.code}]`;
    return successResponse(message, {
      email: user.email,
      expiresIn: '10 minutes',
      attemptsRemaining: rateLimit.remaining,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-otp')
  @Audit(ActivityType.AUTH, 'User verified OTP and logged in')
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Req() req: ExpressRequest,
    @Ip() ip: string,
  ) {
    const userEntity = await this.usersService.findOneByEmail(
      verifyOtpDto.email,
    );

    if (
      !userEntity ||
      (userEntity.status !== UserStatus.ACTIVE &&
        userEntity.status !== UserStatus.PENDING)
    ) {
      throw new BadRequestException('Invalid email or inactive account');
    }

    await this.otpService.verifyOtp(
      userEntity.id,
      verifyOtpDto.code,
      OtpType.LOGIN,
    );

    const response = await this.authService.issueLoginSuccessData(
      userEntity.id,
      req,
      ip,
    );

    return successResponse('Login successful', response);
  }

  @HttpCode(HttpStatus.OK)
  @Post('resend-otp')
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    const rateLimit = await this.rateLimiterService.checkOtpRateLimit(
      resendOtpDto.email,
    );

    if (!rateLimit.allowed) {
      throw new TooManyRequestsException(
        `Too many OTP requests. Please try again after ${rateLimit.resetAt.toLocaleTimeString()}`,
      );
    }

    const userEntity = await this.usersService.findOneByEmail(
      resendOtpDto.email,
    );

    if (
      !userEntity ||
      (userEntity.status !== UserStatus.ACTIVE &&
        userEntity.status !== UserStatus.PENDING)
    ) {
      throw new BadRequestException('Invalid email or inactive account');
    }

    const otp = await this.otpService.createOtp(userEntity.id, OtpType.LOGIN);

    await this.notificationService.sendOtpEmail(userEntity.email, otp.code);

    return successResponse('OTP resent successfully', {
      email: userEntity.email,
      expiresIn: '10 minutes',
      attemptsRemaining: rateLimit.remaining,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refreshToken(
    @Body() body: { refreshToken: string },
    @Req() req: ExpressRequest,
    @Ip() ip: string,
  ) {
    if (!body.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const { newToken: newRefreshToken, userId } =
      await this.refreshTokenService.rotateRefreshToken(body.refreshToken, {
        userAgent: req.headers['user-agent'],
        ip,
      });

    const userEntity = await this.usersService.findOne(userId);

    if (
      !userEntity ||
      (userEntity.status !== UserStatus.ACTIVE &&
        userEntity.status !== UserStatus.PENDING)
    ) {
      throw new BadRequestException('Invalid user or inactive account');
    }

    const user: LoginData = {
      id: userEntity.id,
      email: userEntity.email,
      full_name: userEntity.full_name,
      status: userEntity.status,
    };

    const accessToken = this.authService.generateAccessToken(user);

    return successResponse('Tokens refreshed successfully', {
      accessToken,
      refreshToken: newRefreshToken,
    });
  }

  /*   @HttpCode(HttpStatus.OK)
  @Get('me')
  @UseGuards(PassportJwtGuard)
  getUserInfo(@Request() req: RequestWithUser) {
    return successResponse('User fetched successfully', req.user);
  } */

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @UseGuards(PassportJwtGuard)
  async logout(
    @Request() req: RequestWithUser,
    @Body() body: { refreshToken?: string },
  ) {
    if (body.refreshToken) {
      await this.refreshTokenService.revokeToken(body.refreshToken);
    }

    return successResponse('Logout successful', null);
  }

  @HttpCode(HttpStatus.OK)
  @Get('me')
  @UseGuards(PassportJwtGuard)
  async getCurrentUser(@Req() req: RequestWithUser) {
    const userWithRoles =
      await this.usersService.getUserWithRolesAndPermissions(req.user.id);

    return successResponse('User profile fetched successfully', userWithRoles);
  }

  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  @UseGuards(PassportJwtGuard)
  @Audit(ActivityType.AUTH, 'User changed password')
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: RequestWithUser,
  ) {
    await this.usersService.changePassword(
      req.user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );

    return successResponse(
      'Password changed successfully. You can now login with your new password.',
      null,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('sessions/revoke-others')
  @UseGuards(PassportJwtGuard)
  @Audit(ActivityType.AUTH, 'User revoked other sessions')
  async revokeOtherSessions(
    @Body() body: RevokeOthersSessionsDto,
    @Req() req: RequestWithUser,
  ) {
    await this.refreshTokenService.revokeOtherSessions(
      req.user.id,
      body.refreshToken,
    );
    return successResponse('Other sessions have been signed out', null);
  }

  @HttpCode(HttpStatus.OK)
  @Post('test-email')
  async testEmail(@Body() body: { email: string; code?: string }) {
    if (!body?.email) {
      throw new BadRequestException('Email is required');
    }
    const testCode = body?.code || '123456';
    await this.notificationService.sendOtpEmail(body.email, testCode);
    return successResponse('Test email sent successfully', {
      email: body.email,
      code: testCode,
    });
  }
}
