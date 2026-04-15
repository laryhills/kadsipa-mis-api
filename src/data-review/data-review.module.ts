import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataReviewController } from './data-review.controller';
import { DataReviewService } from './data-review.service';
import { PendingBeneficiaryEntity } from './entities/pending-beneficiary.entity';
import { BeneficiariesModule } from '../beneficiaries/beneficiaries.module';
import { InterventionsModule } from '../interventions/interventions.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { RolesModule } from '../roles/roles.module';
import { LgaEntity } from '@/lgas/entities/lga.entity';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PendingBeneficiaryEntity, LgaEntity]),
    BeneficiariesModule,
    forwardRef(() => InterventionsModule),
    EnrollmentsModule,
    RolesModule,
    DashboardModule,
  ],
  controllers: [DataReviewController],
  providers: [DataReviewService],
  exports: [DataReviewService],
})
export class DataReviewModule {}
