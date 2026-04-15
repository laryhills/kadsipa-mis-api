import { ConfigService } from '@nestjs/config';
import type { DefaultJobOptions } from 'bullmq';

function intFromConfig(
  config: ConfigService,
  key: string,
  fallback: number,
): number {
  const raw = config.get<string | number | undefined>(key);
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function createBullMqDefaultJobOptions(
  config: ConfigService,
): DefaultJobOptions {
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  const removeOnComplete: DefaultJobOptions['removeOnComplete'] = isProduction
    ? true
    : {
        count: intFromConfig(config, 'BULL_REMOVE_ON_COMPLETE_MAX_COUNT', 100),
        age: intFromConfig(config, 'BULL_REMOVE_ON_COMPLETE_MAX_AGE_SEC', 3600),
      };

  return {
    removeOnComplete,
    removeOnFail: {
      age: intFromConfig(config, 'BULL_REMOVE_ON_FAIL_MAX_AGE_SEC', 24 * 3600),
      count: intFromConfig(config, 'BULL_REMOVE_ON_FAIL_MAX_COUNT', 5000),
    },
  };
}
