import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardCacheService {
  private epoch = 0;

  invalidate(): void {
    this.epoch += 1;
  }

  getEpoch(): number {
    return this.epoch;
  }
}
