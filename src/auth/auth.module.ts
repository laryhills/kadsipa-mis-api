import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '@/users/users.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsModule } from '@/notifications/notifications.module';
import { OtpService } from './services/otp.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { OtpEntity } from './entities/otp.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';

@Module({
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    OtpService,
    RefreshTokenService,
    RateLimiterService,
  ],
  controllers: [AuthController],
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([OtpEntity, RefreshTokenEntity]),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        global: true,
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    PassportModule,
    NotificationsModule.forRoot(),
  ],
  exports: [AuthService, JwtModule, OtpService, RefreshTokenService],
})
export class AuthModule {}
