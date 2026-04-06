import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { RequestWithUserInterface } from '@/common/interfaces/request-inteface';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<RequestWithUserInterface>();
    if (!request.user) {
      throw new UnauthorizedException('User not authenticated');
    }
    return request.user as JwtPayload;
  },
);
