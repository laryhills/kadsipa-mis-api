import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { createResponse } from '../response.helper';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(@Inject(JwtService) private readonly jwtService: JwtService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestWithUser>();
    const res = ctx.getResponse<Response>();

    const { status, message } = this.normalizeException(exception);
    let token: string | undefined;

    if (req.user) {
      const payload = {
        sub: req.user.id,
        email: req.user.email,
      };
      token = this.jwtService.sign(payload);
    }

    const body = createResponse(status, message, null, token);

    res.status(status).json(body);
  }

  private normalizeException(exception: unknown): {
    status: number;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : this.getMessageFromResponse(response);
      return { status, message };
    }

    this.logger.error(exception);
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }

  private getMessageFromResponse(response: object): string | string[] {
    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const msg = (response as { message?: string | string[] }).message;
      // return Array.isArray(msg) ? (msg ?? 'Validation failed') : String(msg);
      return Array.isArray(msg) ? (msg[0] ?? 'Validation failed') : String(msg);
    }
    return 'An error occurred';
  }
}
