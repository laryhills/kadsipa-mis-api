import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RequestWithUserInterface } from '@/common/interfaces/request-inteface';
import { ApiResponse } from '@/common/interfaces/api-response.interface';

@Injectable()
export class TokenRefreshInterceptor implements NestInterceptor {
  constructor(private readonly jwtService: JwtService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithUserInterface>();
    const user = request.user;

    return next.handle().pipe(
      map((response: ApiResponse<unknown>) => {
        if (user && response && typeof response === 'object') {
          const payload = {
            sub: user.id,
            email: user.email,
          };

          const newToken = this.jwtService.sign(payload);

          return {
            ...response,
            token: newToken,
          };
        }

        return response;
      }),
    );
  }
}
