import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BeneficiariesService } from './beneficiaries.service';
import { BeneficiariesController } from './beneficiaries.controller';
import { BeneficiaryEntity } from './entities/beneficiary.entity';
import { LgasModule } from '../lgas/lgas.module';

@Module({
  imports: [TypeOrmModule.forFeature([BeneficiaryEntity]), LgasModule],
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService],
  exports: [BeneficiariesService],
})
export class BeneficiariesModule {}
