import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorFunction,
  MemoryHealthIndicator,
  MongooseHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealth } from './redis-health';

@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly typeorm: TypeOrmHealthIndicator,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly redisHealth: RedisHealth,
    private readonly config: ConfigService,
  ) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.typeorm.pingCheck('database', { timeout: 2000 }),
      () => this.mongoose.pingCheck('mongodb', { timeout: 2000 }),
      () => this.redisHealth.pingCheck(),
    ]);
  }

  @Get()
  @HealthCheck()
  check() {
    const heapMb = this.config.get<string>('HEALTH_CHECK_HEAP_MB');
    const checks: HealthIndicatorFunction[] = [
      () => this.typeorm.pingCheck('database', { timeout: 2000 }),
      () => this.mongoose.pingCheck('mongodb', { timeout: 2000 }),
      () => this.redisHealth.pingCheck(),
    ];
    if (
      heapMb !== undefined &&
      heapMb !== '' &&
      !Number.isNaN(Number(heapMb))
    ) {
      const bytes = Number(heapMb) * 1024 * 1024;
      checks.push(() => this.memory.checkHeap('memory_heap', bytes));
    }
    return this.health.check(checks);
  }
}
