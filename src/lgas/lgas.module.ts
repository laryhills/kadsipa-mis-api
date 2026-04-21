import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LgasController } from './lgas.controller';
import { LgasService } from './lgas.service';
import { LgaEntity } from './entities/lga.entity';
import { StateEntity } from './entities/state.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LgaEntity, StateEntity])],
  controllers: [LgasController],
  providers: [LgasService],
  exports: [TypeOrmModule, LgasService],
})
export class LgasModule {}
