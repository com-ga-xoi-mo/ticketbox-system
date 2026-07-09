import { Injectable } from '@nestjs/common';
import type { WaitingRoomConfig } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  WaitingRoomConfigInput,
  WaitingRoomConfigRecord,
} from '../../domain/waiting-room.types';
import type { WaitingRoomConfigRepositoryPort } from '../../domain/ports/waiting-room-config-repository.port';

@Injectable()
export class PrismaWaitingRoomConfigRepository
  implements WaitingRoomConfigRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findByConcertId(concertId: string): Promise<WaitingRoomConfigRecord | null> {
    const config = await this.prisma.waitingRoomConfig.findUnique({
      where: { concertId },
    });
    return config ? this.toRecord(config) : null;
  }

  async upsert(input: WaitingRoomConfigInput): Promise<WaitingRoomConfigRecord> {
    const config = await this.prisma.waitingRoomConfig.upsert({
      where: { concertId: input.concertId },
      create: {
        concertId: input.concertId,
        enabled: input.enabled,
        autoActivate: input.autoActivate,
        manualOverride: input.manualOverride,
        maxConcurrency: input.maxConcurrency,
        admissionTtlSeconds: input.admissionTtlSeconds,
        activateThreshold: input.activateThreshold,
        deactivateThreshold: input.deactivateThreshold,
        cooldownSeconds: input.cooldownSeconds,
      },
      update: {
        enabled: input.enabled,
        autoActivate: input.autoActivate,
        manualOverride: input.manualOverride,
        maxConcurrency: input.maxConcurrency,
        admissionTtlSeconds: input.admissionTtlSeconds,
        activateThreshold: input.activateThreshold,
        deactivateThreshold: input.deactivateThreshold,
        cooldownSeconds: input.cooldownSeconds,
      },
    });
    return this.toRecord(config);
  }

  async setManualOverride(input: {
    concertId: string;
    manualOverride: WaitingRoomConfigInput['manualOverride'];
  }): Promise<WaitingRoomConfigRecord | null> {
    const exists = await this.concertExists(input.concertId);
    if (!exists) {
      return null;
    }
    const config = await this.prisma.waitingRoomConfig.upsert({
      where: { concertId: input.concertId },
      create: {
        concertId: input.concertId,
        enabled: true,
        autoActivate: false,
        manualOverride: input.manualOverride,
      },
      update: { manualOverride: input.manualOverride },
    });
    return this.toRecord(config);
  }

  async listRunnableRooms(): Promise<WaitingRoomConfigRecord[]> {
    const configs = await this.prisma.waitingRoomConfig.findMany({
      where: {
        enabled: true,
        OR: [{ manualOverride: 'FORCE_ON' }, { autoActivate: true }],
      },
    });
    return configs.map((config) => this.toRecord(config));
  }

  async concertExists(concertId: string): Promise<boolean> {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { id: true },
    });
    return Boolean(concert);
  }

  private toRecord(config: WaitingRoomConfig): WaitingRoomConfigRecord {
    return {
      id: config.id,
      concertId: config.concertId,
      enabled: config.enabled,
      autoActivate: config.autoActivate,
      manualOverride: config.manualOverride,
      maxConcurrency: config.maxConcurrency,
      admissionTtlSeconds: config.admissionTtlSeconds,
      activateThreshold: config.activateThreshold,
      deactivateThreshold: config.deactivateThreshold,
      cooldownSeconds: config.cooldownSeconds,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
