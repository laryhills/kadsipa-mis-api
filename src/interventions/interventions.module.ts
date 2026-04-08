import { Module, forwardRef } from '@nestjs/common';
import { InterventionsService } from './interventions.service';
import { InterventionsController } from './interventions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterventionEntity } from './entities/intervention.entity';
import { LgaEntity } from '../lgas/entities/lga.entity';
import { RolesModule } from '../roles/roles.module';
import { DataReviewModule } from '../data-review/data-review.module';
import { BeneficiariesModule } from '../beneficiaries/beneficiaries.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InterventionEntity, LgaEntity]),
    RolesModule,
    BeneficiariesModule,
    forwardRef(() => DataReviewModule),
  ],
  controllers: [InterventionsController],
  providers: [InterventionsService],
  exports: [InterventionsService],
})
export class InterventionsModule {}
