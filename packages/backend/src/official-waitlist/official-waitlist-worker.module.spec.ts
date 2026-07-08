import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';

import {
  ExpireWaitlistEntitlementsUseCase,
  GrantWaitlistEntitlementsUseCase,
  SendWaitlistEntitlementRemindersUseCase,
} from './application/use-cases/waitlist.use-cases';
import { OFFICIAL_WAITLIST_QUEUE } from './infrastructure/queue/official-waitlist-queue.constants';
import { OfficialWaitlistProcessor } from './infrastructure/queue/official-waitlist.processor';

describe('OfficialWaitlistProcessor provider wiring', () => {
  it('resolves the official waitlist queue token from its module scope', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OfficialWaitlistProcessor,
        {
          provide: GrantWaitlistEntitlementsUseCase,
          useValue: { execute: vi.fn() },
        },
        {
          provide: ExpireWaitlistEntitlementsUseCase,
          useValue: { execute: vi.fn() },
        },
        {
          provide: SendWaitlistEntitlementRemindersUseCase,
          useValue: { execute: vi.fn() },
        },
        {
          provide: getQueueToken(OFFICIAL_WAITLIST_QUEUE),
          useValue: { add: vi.fn() },
        },
      ],
    }).compile();

    expect(moduleRef.get(OfficialWaitlistProcessor)).toBeInstanceOf(
      OfficialWaitlistProcessor,
    );
  });
});
