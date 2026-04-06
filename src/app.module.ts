import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_FILTER } from '@nestjs/core';
import { join } from 'path';
import databaseConfig from '../config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InterventionsModule } from './interventions/interventions.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BeneficiariesModule } from './beneficiaries/beneficiaries.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { LgasModule } from './lgas/lgas.module';
import { WardsModule } from './wards/wards.module';
import { AuditModule } from './audit/audit.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { NotificationsModule } from './notifications/notifications.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { TasksModule } from './tasks/tasks.module';
import { RolesModule } from './roles/roles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.production'
          : '.env.development',
      validate: (env) => {
        if (!env.DATABASE_HOST) throw new Error('DATABASE_HOST is not defined');
        if (!env.DATABASE_USER) throw new Error('DATABASE_USER is not defined');
        if (!env.DATABASE_PORT) throw new Error('DATABASE_PORT is not defined');
        if (!env.DATABASE_PASSWORD)
          throw new Error('DATABASE_PASSWORD is not defined');
        if (!env.DATABASE_NAME) throw new Error('DATABASE_NAME is not defined');
        if (!env.JWT_SECRET) throw new Error('JWT_SECRET is not defined');
        if (!env.MONGO_URI) throw new Error('MONGO_URI is not defined');
        return env;
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return {
          uri: configService.get('MONGO_URI'),
          retryAttempts: 3,
          retryDelay: 1000,
        };
      },
      inject: [ConfigService],
    }),
    InterventionsModule,
    UsersModule,
    AuthModule,
    BeneficiariesModule,
    EnrollmentsModule,
    LgasModule,
    WardsModule,
    AuditModule,
    NotificationsModule.forRoot(),
    TasksModule,
    RolesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
