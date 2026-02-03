import { Module } from '@nestjs/common';
import { InterventionsService } from './interventions.service';
import { InterventionsController } from './interventions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterventionEntity } from '@/interventions/entities/intervention.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InterventionEntity])],
  controllers: [InterventionsController],
  providers: [InterventionsService],
})
export class InterventionsModule {}
