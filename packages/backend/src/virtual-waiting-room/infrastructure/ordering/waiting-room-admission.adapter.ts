import { Injectable } from '@nestjs/common';

import type { WaitingRoomAdmissionPort } from '../../../ordering/domain/ports/waiting-room-admission.port';
import { PlatformConfigService } from '../../../platform/config/platform-config.service';
import { IncrementWaitingRoomLoadUseCase } from '../../application/use-cases/increment-waiting-room-load.use-case';
import { ReleaseAdmissionSlotUseCase } from '../../application/use-cases/release-admission-slot.use-case';
import { ConsumeAndHoldSlotUseCase } from '../../application/use-cases/consume-and-hold-slot.use-case';
import { ValidateAdmissionUseCase } from '../../application/use-cases/validate-admission.use-case';

@Injectable()
export class WaitingRoomAdmissionAdapter implements WaitingRoomAdmissionPort {
  constructor(
    private readonly incrementWaitingRoomLoad: IncrementWaitingRoomLoadUseCase,
    private readonly validateAdmission: ValidateAdmissionUseCase,
    private readonly releaseAdmissionSlot: ReleaseAdmissionSlotUseCase,
    private readonly consumeAndHoldSlotUseCase: ConsumeAndHoldSlotUseCase,
    private readonly config: PlatformConfigService,
  ) {}

  async incrementLoad(concertId: string): Promise<void> {
    await this.incrementWaitingRoomLoad.execute(concertId);
  }

  async validate(input: {
    concertId: string;
    userId: string;
    token?: string;
  }): Promise<void> {
    await this.validateAdmission.execute({
      ...input,
      failOpen: this.config.waitingRoomFailOpen,
    });
  }

  async release(input: { concertId: string; userId: string }): Promise<void> {
    await this.releaseAdmissionSlot.execute(input);
  }

  async consumeAndHoldSlot(input: {
    concertId: string;
    userId: string;
    holdTtlMinutes: number;
  }): Promise<void> {
    await this.consumeAndHoldSlotUseCase.execute(input);
  }
}

