import { type LoginData } from '@/auth/auth.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (_req, _rawJwtToken, done) => {
        done(null, this.configService.get('JWT_SECRET'));
      },
    });
  }

  validate(payload: { sub: string; email: string }) {
    return { id: payload.sub, email: payload.email } as LoginData;
  }
}
