import { AuthService, type LoginData } from '@/auth/auth.service';
import {
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

type RequestWithUser = ExpressRequest & { user: LoginData };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UseGuards(PassportLocalGuard)
  async login(@Request() request: RequestWithUser) {
    const data = await this.authService.login(request.user);
    return successResponse('Login successful', data, data.token);
  }

  @HttpCode(HttpStatus.OK)
  @Get('me')
  @UseGuards(PassportJwtGuard)
  getUserInfo(@Request() req: RequestWithUser) {
    return successResponse('User fetched successfully', req.user);
  }

  /*   @HttpCode(HttpStatus.OK)
  @Post('logout')
  @UseGuards(PassportJwtGuard)
  async logout(@Request() req: RequestWithUser) {
    return successResponse('Logout successful', null);
  } */
}
