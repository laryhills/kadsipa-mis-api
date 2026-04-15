import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetLinesService } from './budget-lines.service';
import { BudgetLinesController } from './budget-lines.controller';
import { BudgetLineEntity } from './entities/budget-line.entity';
import { FiscalYearEntity } from '../fiscal-years/entities/fiscal-year.entity';
import { DepartmentEntity } from '../departments/entities/department.entity';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BudgetLineEntity,
      FiscalYearEntity,
      DepartmentEntity,
    ]),
    RolesModule,
  ],
  providers: [BudgetLinesService],
  controllers: [BudgetLinesController],
  exports: [BudgetLinesService],
})
export class BudgetLinesModule {}
