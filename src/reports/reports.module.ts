import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { createBullMqDefaultJobOptions } from '../../config/bullmq-default-job-options';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportEntity } from './entities/report.entity';
import { ReportsProcessor } from './processors/reports.processor';
import { ReportGeneratorService } from './services/report-generator.service';
import { InterventionEntity } from '../interventions/entities/intervention.entity';
import { BeneficiaryEntity } from '../beneficiaries/entities/beneficiary.entity';
import { DisbursementEntity } from '../disbursements/entities/disbursement.entity';
import { BudgetLineEntity } from '../budget-lines/entities/budget-line.entity';
import { EnrollmentEntity } from '../enrollments/entities/enrollment.entity';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportEntity,
      InterventionEntity,
      BeneficiaryEntity,
      DisbursementEntity,
      BudgetLineEntity,
      EnrollmentEntity,
    ]),
    BullModule.registerQueueAsync({
      name: 'reports',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        defaultJobOptions: createBullMqDefaultJobOptions(configService),
      }),
      inject: [ConfigService],
    }),
    RolesModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsProcessor, ReportGeneratorService],
  exports: [ReportsService],
})
export class ReportsModule {}
