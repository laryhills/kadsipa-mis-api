import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FundRequestsService } from './fund-requests.service';
import { FundRequestsController } from './fund-requests.controller';
import { FundRequestEntity } from './entities/fund-request.entity';
import { BudgetLineEntity } from '../budget-lines/entities/budget-line.entity';
import { InterventionEntity } from '../interventions/entities/intervention.entity';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FundRequestEntity,
      BudgetLineEntity,
      InterventionEntity,
    ]),
    RolesModule,
  ],
  controllers: [FundRequestsController],
  providers: [FundRequestsService],
  exports: [FundRequestsService],
})
export class FundRequestsModule {}
