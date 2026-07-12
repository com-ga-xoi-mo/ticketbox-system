import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';

import {
  ExpireLotteryEntitlementsUseCase,
  RunDueLotteryDrawsUseCase,
  RunLotteryDrawUseCase,
  SendLotteryEntitlementRemindersUseCase,
} from '../../application/use-cases/lottery.use-cases';
import {
  EXPIRE_LOTTERY_ENTITLEMENTS_JOB,
  PRESALE_LOTTERY_QUEUE,
  RUN_LOTTERY_DRAW_JOB,
} from './presale-lottery-queue.constants';

@Injectable()
@Processor(PRESALE_LOTTERY_QUEUE)
export class PresaleLotteryProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(PresaleLotteryProcessor.name);

  constructor(
    private readonly runLotteryDraw: RunLotteryDrawUseCase,
    private readonly runDueLotteryDraws: RunDueLotteryDrawsUseCase,
    private readonly expireLotteryEntitlements: ExpireLotteryEntitlementsUseCase,
    private readonly sendLotteryEntitlementReminders: SendLotteryEntitlementRemindersUseCase,
    @InjectQueue(PRESALE_LOTTERY_QUEUE)
    private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    // Periodic scan: run due draws, expire entitlements, and send reminders.
    await this.queue.add(
      EXPIRE_LOTTERY_ENTITLEMENTS_JOB,
      {},
      {
        jobId: EXPIRE_LOTTERY_ENTITLEMENTS_JOB,
        repeat: { every: 60_000 },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );
  }

  async process(job: Job): Promise<unknown> {
    if (job.name === RUN_LOTTERY_DRAW_JOB) {
      const result = await this.runLotteryDraw.execute({
        ticketTypeId: job.data.ticketTypeId,
      });
      this.logger.debug(
        `Lottery draw job ${job.id} granted=${result.granted}, notSelected=${result.notSelected}`,
      );
      return result;
    }

    const draws = await this.runDueLotteryDraws.execute();
    const expired = await this.expireLotteryEntitlements.execute();
    const reminders = await this.sendLotteryEntitlementReminders.execute();
    this.logger.debug(
      `Lottery scan job ${job.id} drawsRun=${draws.drawsRun}, granted=${draws.granted}, expired=${expired.expired}, remindersEnqueued=${reminders.enqueued}`,
    );
    return {
      drawsRun: draws.drawsRun,
      granted: draws.granted,
      expired: expired.expired,
      remindersEnqueued: reminders.enqueued,
    };
  }
}
