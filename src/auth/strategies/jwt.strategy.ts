import { type LoginData } from '@/auth/auth.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '@/users/users.service';
import { UserStatus } from '@/users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (_req, _rawJwtToken, done) => {
        done(null, this.configService.get('JWT_SECRET'));
      },
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    purpose?: string;
  }): Promise<LoginData> {
    if (payload.purpose) {
      throw new UnauthorizedException('Invalid token');
    }
    const user = await this.usersService.findActiveAuthUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Account is no longer available');
    }
    if (user.email !== payload.email) {
      throw new UnauthorizedException('Invalid token');
    }
    if (
      user.status !== UserStatus.ACTIVE &&
      user.status !== UserStatus.PENDING
    ) {
      throw new UnauthorizedException('Account is not active');
    }
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      status: user.status,
      requirePasswordChange: user.status === UserStatus.PENDING,
    };
  }
}
