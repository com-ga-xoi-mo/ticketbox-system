import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { parseExpression } from 'cron-parser';
import { PlatformConfigService } from '../../../platform/config/platform-config.service';
import { DiscoverGuestListFilesUseCase } from '../../application/use-cases/discover-guest-list-files.use-case';
import { ReconcileGuestListJobsUseCase } from '../../application/use-cases/reconcile-guest-list-jobs.use-case';

@Injectable()
export class GuestListSchedulerService implements OnModuleInit, OnModuleDestroy {
  private reconciliationTimer?: NodeJS.Timeout;
  private discoveryTimer?: NodeJS.Timeout;
  private discoveryRunning = false;
  private readonly logger = new Logger(GuestListSchedulerService.name);
  constructor(
    private readonly discovery: DiscoverGuestListFilesUseCase,
    private readonly reconcile: ReconcileGuestListJobsUseCase,
    private readonly config: PlatformConfigService,
  ) {}
  onModuleInit() {
    this.reconciliationTimer = setInterval(() => void this.reconcileTick(), 60_000);
    this.discoveryTimer = setInterval(() => void this.discoveryTick(), 60_000);
    this.reconciliationTimer.unref();
    this.discoveryTimer.unref();
  }
  onModuleDestroy() {
    if (this.reconciliationTimer) clearInterval(this.reconciliationTimer);
    if (this.discoveryTimer) clearInterval(this.discoveryTimer);
  }
  private async reconcileTick() {
    try {
      await this.reconcile.execute();
    } catch (error) {
      this.logger.error(
        'Guest-list reconciliation failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async discoveryTick() {
    if (this.discoveryRunning) return;
    try {
      if (!isCronDue(this.config.guestListDiscoveryCron, new Date())) return;
      this.discoveryRunning = true;
      await this.discovery.execute();
    } catch (error) {
      this.logger.error(
        'Guest-list discovery failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.discoveryRunning = false;
    }
  }
}

export function isCronDue(expression: string, now: Date): boolean {
  const minute = new Date(now);
  minute.setSeconds(0, 0);
  const nextMinute = new Date(minute.getTime() + 60_000);
  return (
    parseExpression(expression, { currentDate: nextMinute }).prev().getTime() === minute.getTime()
  );
}
