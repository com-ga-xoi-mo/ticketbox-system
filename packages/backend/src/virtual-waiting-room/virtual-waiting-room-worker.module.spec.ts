import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';

import { AdmitWaitingRoomUseCase } from './application/use-cases/admit-waiting-room.use-case';
import { WaitingRoomAdmitProcessor } from './infrastructure/queue/waiting-room-admit.processor';
import { VIRTUAL_WAITING_ROOM_QUEUE } from './infrastructure/queue/waiting-room-queue.constants';

describe('VirtualWaitingRoomWorkerModule wiring', () => {
  it('resolves the admit processor with its queue provider in worker scope', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        WaitingRoomAdmitProcessor,
        {
          provide: AdmitWaitingRoomUseCase,
          useValue: { executeRunnableRooms: vi.fn(async () => []) },
        },
        {
          provide: getQueueToken(VIRTUAL_WAITING_ROOM_QUEUE),
          useValue: { add: vi.fn(async () => undefined) },
        },
      ],
    }).compile();

    expect(moduleRef.get(WaitingRoomAdmitProcessor)).toBeInstanceOf(
      WaitingRoomAdmitProcessor,
    );
  });
});

