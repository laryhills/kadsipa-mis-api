import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FiscalYearsService } from './fiscal-years.service';
import { FiscalYearsController } from './fiscal-years.controller';
import { FiscalYearEntity } from './entities/fiscal-year.entity';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [TypeOrmModule.forFeature([FiscalYearEntity]), RolesModule],
  controllers: [FiscalYearsController],
  providers: [FiscalYearsService],
  exports: [FiscalYearsService],
})
export class FiscalYearsModule {}
