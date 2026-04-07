import { Module } from '@nestjs/common';
import { InterventionsService } from './interventions.service';
import { InterventionsController } from './interventions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterventionEntity } from './entities/intervention.entity';
import { LgaEntity } from '../lgas/entities/lga.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InterventionEntity, LgaEntity]),
    NotificationsModule,
    RolesModule,
  ],
  controllers: [InterventionsController],
  providers: [InterventionsService],
  exports: [InterventionsService],
})
export class InterventionsModule {}
