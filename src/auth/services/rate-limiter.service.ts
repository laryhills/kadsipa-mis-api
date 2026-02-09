import { Injectable, Logger } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly storage = new Map<string, RateLimitEntry>();
  private readonly maxAttempts = 3;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes

  // eslint-disable-next-line @typescript-eslint/require-await
  async checkOtpRateLimit(email: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    const key = `otp:${email}`;
    const now = new Date();

    let entry = this.storage.get(key);

    if (!entry || now > entry.resetAt) {
      entry = {
        count: 0,
        resetAt: new Date(now.getTime() + this.windowMs),
      };
      this.storage.set(key, entry);
    }

    entry.count++;

    const allowed = entry.count <= this.maxAttempts;
    const remaining = Math.max(0, this.maxAttempts - entry.count);

    if (!allowed) {
      this.logger.warn(
        `Rate limit exceeded for ${email}. Attempts: ${entry.count}/${this.maxAttempts}`,
      );
    }

    return {
      allowed,
      remaining,
      resetAt: entry.resetAt,
    };
  }

  resetOtpRateLimit(email: string): void {
    const key = `otp:${email}`;
    this.storage.delete(key);
    this.logger.log(`Reset rate limit for ${email}`);
  }

  cleanupExpiredEntries(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [key, entry] of this.storage.entries()) {
      if (now > entry.resetAt) {
        this.storage.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }
}
