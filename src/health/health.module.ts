import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealth } from './redis-health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [RedisHealth],
})
export class HealthModule {}
