import { AuthService, type LoginData } from '@/auth/auth.service';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { successResponse } from '@/common';
import { PassportLocalGuard } from './guards/passport-local.guard';
import { PassportJwtGuard } from './guards/passport-jwt.guard';
import { Audit } from '@/audit/decorators/audit.decorator';
import { ActivityType } from '@/audit/constants/audit-action.enum';
import { NotificationService } from '@/notifications/notifications.service';

export type RequestWithUser = ExpressRequest & { user: LoginData };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UseGuards(PassportLocalGuard)
  @Audit(ActivityType.AUTH, 'User logged in')
  async login(@Request() request: RequestWithUser) {
    const data = await this.authService.login(request.user);
    return successResponse('Login successful', data);
  }

  @HttpCode(HttpStatus.OK)
  @Get('me')
  @UseGuards(PassportJwtGuard)
  getUserInfo(@Request() req: RequestWithUser) {
    return successResponse('User fetched successfully', req.user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('test-email')
  @UseGuards(PassportJwtGuard)
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

  /*   @HttpCode(HttpStatus.OK)
  @Post('logout')
  @UseGuards(PassportJwtGuard)
  async logout(@Request() req: RequestWithUser) {
    return successResponse('Logout successful', null);
  } */
}
