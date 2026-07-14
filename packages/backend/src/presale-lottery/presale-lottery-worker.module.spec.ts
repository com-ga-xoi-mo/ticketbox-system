import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';

import {
  RunDueLotteryDrawsUseCase,
  RunLotteryDrawUseCase,
} from './application/use-cases/lottery.use-cases';
import { PRESALE_LOTTERY_QUEUE } from './infrastructure/queue/presale-lottery-queue.constants';
import { PresaleLotteryProcessor } from './infrastructure/queue/presale-lottery.processor';

describe('PresaleLotteryProcessor provider wiring', () => {
  it('resolves the presale lottery queue token from its module scope', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PresaleLotteryProcessor,
        { provide: RunLotteryDrawUseCase, useValue: { execute: vi.fn() } },
        { provide: RunDueLotteryDrawsUseCase, useValue: { execute: vi.fn() } },
        { provide: getQueueToken(PRESALE_LOTTERY_QUEUE), useValue: { add: vi.fn() } },
      ],
    }).compile();

    expect(moduleRef.get(PresaleLotteryProcessor)).toBeInstanceOf(PresaleLotteryProcessor);
  });
});
