import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WardsController } from './wards.controller';
import { WardsService } from './wards.service';
import { WardEntity } from './entities/ward.entity';
import { LgasModule } from '@/lgas/lgas.module';

@Module({
  imports: [TypeOrmModule.forFeature([WardEntity]), LgasModule],
  controllers: [WardsController],
  providers: [WardsService],
})
export class WardsModule {}
