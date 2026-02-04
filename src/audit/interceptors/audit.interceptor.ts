import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import {
  AUDIT_METADATA_KEY,
  AuditMetadata,
} from '../decorators/audit.decorator';
import { ActivityLogsService } from '../services/activity-logs.service';

interface RequestWithUser extends Request {
  user?: {
    id: string;
  };
}

interface HttpError extends Error {
  status?: number;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditMetadata = this.reflector.get<AuditMetadata>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const ipAddress = this.extractIpAddress(request);

    return next.handle().pipe(
      tap({
        next: (data: unknown) => {
          void (async () => {
            try {
              await this.activityLogsService.create({
                userId: user?.id,
                activityType: auditMetadata.activityType,
                description: auditMetadata.description,
                logDetails: {
                  method: request.method,
                  url: request.url,
                  params: request.params,
                  body: this.sanitizeBody(request.body),
                  response: this.sanitizeResponse(data),
                },
                ipAddress,
              });
            } catch (error) {
              console.error('Error logging activity:', error);
            }
          })();
        },
        error: (error: unknown) => {
          void (async () => {
            try {
              const httpError = error as HttpError;
              await this.activityLogsService.create({
                userId: user?.id,
                activityType: auditMetadata.activityType,
                description: `${auditMetadata.description} - FAILED`,
                logDetails: {
                  method: request.method,
                  url: request.url,
                  params: request.params,
                  error: httpError.message,
                  statusCode: httpError.status,
                },
                ipAddress,
              });
            } catch (logError) {
              console.error('Error logging failed activity:', logError);
            }
          })();
        },
      }),
    );
  }

  private extractIpAddress(request: RequestWithUser): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwardedForArray = Array.isArray(forwardedFor)
      ? forwardedFor
      : forwardedFor?.split(',');

    return (
      forwardedForArray?.[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.socket?.remoteAddress ||
      request.ip ||
      ''
    );
  }

  private sanitizeBody(body: unknown): Record<string, unknown> {
    if (!body || typeof body !== 'object') return {};

    const sanitized = { ...(body as Record<string, unknown>) };
    const sensitiveFields = ['password', 'mfa_secret', 'token'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private sanitizeResponse(response: unknown): Record<string, unknown> {
    if (!response || typeof response !== 'object') {
      return { success: true };
    }

    if (Array.isArray(response)) {
      return { count: response.length };
    }

    const responseObj = response as Record<string, unknown>;

    if (responseObj.data && Array.isArray(responseObj.data)) {
      return {
        count: responseObj.data.length,
        hasMore: !!responseObj.meta,
      };
    }

    return { success: true };
  }
}
