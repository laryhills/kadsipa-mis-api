import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealth {
  constructor(
    private readonly config: ConfigService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async pingCheck() {
    const indicator = this.healthIndicatorService.check('redis');
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = Number(this.config.get('REDIS_PORT', 6379));
    const client = new Redis({
      host,
      port,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    });
    try {
      await client.connect();
      const pong = await client.ping();
      await client.quit();
      if (pong !== 'PONG') {
        return indicator.down({
          message: `unexpected ping response: ${String(pong)}`,
        });
      }
      return indicator.up();
    } catch (err) {
      try {
        client.disconnect();
      } catch {
        /* ignore */
      }
      return indicator.down({
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
