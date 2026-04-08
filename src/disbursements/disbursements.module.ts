import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisbursementsService } from './disbursements.service';
import { DisbursementsController } from './disbursements.controller';
import { DisbursementEntity } from './entities/disbursement.entity';
import { FundRequestEntity } from '../fund-requests/entities/fund-request.entity';
import { BudgetLineEntity } from '../budget-lines/entities/budget-line.entity';
import { BeneficiariesModule } from '../beneficiaries/beneficiaries.module';
import { InterventionsModule } from '../interventions/interventions.module';
import { RolesModule } from '../roles/roles.module';
import { EnrollmentsModule } from '@/enrollments/enrollments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DisbursementEntity,
      FundRequestEntity,
      BudgetLineEntity,
    ]),
    BeneficiariesModule,
    InterventionsModule,
    RolesModule,
    EnrollmentsModule,
  ],
  providers: [DisbursementsService],
  controllers: [DisbursementsController],
  exports: [DisbursementsService],
})
export class DisbursementsModule {}
