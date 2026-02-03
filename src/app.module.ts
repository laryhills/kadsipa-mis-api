import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import databaseConfig from '../config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InterventionsModule } from './interventions/interventions.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BeneficiariesModule } from './beneficiaries/beneficiaries.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';

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
        return env;
      },
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
        migrations: [join(__dirname, '..', '..', 'migrations', '*.{ts,js}')],
        // TODO: set to false in production for migrations to work
        synchronize: true, // must be false in production for migrations to work
      }),
      inject: [ConfigService],
    }),
    InterventionsModule,
    UsersModule,
    AuthModule,
    BeneficiariesModule,
    EnrollmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
