import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisbursementsService } from './disbursements.service';
import { DisbursementsController } from './disbursements.controller';
import { DisbursementEntity } from './entities/disbursement.entity';
import { BudgetLinesModule } from '../budget-lines/budget-lines.module';
import { BeneficiariesModule } from '../beneficiaries/beneficiaries.module';
import { InterventionsModule } from '../interventions/interventions.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DisbursementEntity]),
    BudgetLinesModule,
    BeneficiariesModule,
    InterventionsModule,
    RolesModule,
  ],
  providers: [DisbursementsService],
  controllers: [DisbursementsController],
  exports: [DisbursementsService],
})
export class DisbursementsModule {}
