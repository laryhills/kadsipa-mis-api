import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { createResponse } from '../response.helper';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const { status, message } = this.normalizeException(exception);
    const body = createResponse(status, message, null);

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
