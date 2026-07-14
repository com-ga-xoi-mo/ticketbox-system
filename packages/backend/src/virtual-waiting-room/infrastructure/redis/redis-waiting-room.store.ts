import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { REDIS_CLIENT } from '../../../platform/redis/redis.tokens';
import type {
  AdmitBatchInput,
  UpdateLoadStateInput,
  ValidateAdmissionInput,
  WaitingRoomStorePort,
} from '../../domain/ports/waiting-room-store.port';
import type {
  AdmissionTokenRecord,
  AdmitWaitingRoomResult,
  WaitingRoomLoadSnapshot,
  WaitingRoomQueueStatus,
} from '../../domain/waiting-room.types';

const LOAD_COUNTER_TTL_SECONDS = 10;
const LOAD_STATE_TTL_SECONDS = 300;
const LOCK_TTL_MS = 5_000;

@Injectable()
export class RedisWaitingRoomStore implements WaitingRoomStorePort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async joinQueue(input: {
    concertId: string;
    userId: string;
    joinedAt: Date;
  }): Promise<WaitingRoomQueueStatus> {
    const admitted = await this.readAdmissionForUser(input.concertId, input.userId);
    if (admitted) {
      return this.toAdmittedStatus(input.concertId, input.userId, admitted);
    }

    await this.redis.zadd(
      this.waitingKey(input.concertId),
      'NX',
      input.joinedAt.getTime(),
      input.userId,
    );
    return this.getQueueStatus(input);
  }

  async leave(input: { concertId: string; userId: string }): Promise<void> {
    await this.releaseAdmissionSlot(input);
    await this.redis.zrem(this.waitingKey(input.concertId), input.userId);
  }

  async getQueueStatus(input: {
    concertId: string;
    userId: string;
  }): Promise<WaitingRoomQueueStatus> {
    const admitted = await this.readAdmissionForUser(input.concertId, input.userId);
    if (admitted) {
      return this.toAdmittedStatus(input.concertId, input.userId, admitted);
    }

    const rank = await this.redis.zrank(this.waitingKey(input.concertId), input.userId);
    if (rank === null) {
      return {
        concertId: input.concertId,
        userId: input.userId,
        active: true,
        status: 'LEFT',
        position: null,
        admissionToken: null,
        admissionExpiresAt: null,
      };
    }

    return {
      concertId: input.concertId,
      userId: input.userId,
      active: true,
      status: 'WAITING',
      position: rank + 1,
      admissionToken: null,
      admissionExpiresAt: null,
    };
  }

  async admitBatch(input: AdmitBatchInput): Promise<AdmitWaitingRoomResult> {
    const expiredUserIds = await this.reclaimExpired(input.concertId, input.now);
    const activeCount = await this.redis.zcard(this.activeKey(input.concertId));
    const capacity = Math.max(0, input.maxConcurrency - activeCount);
    const admitted: AdmissionTokenRecord[] = [];
    if (capacity === 0) {
      return { admitted, expiredUserIds };
    }

    for (let i = 0; i < capacity; i += 1) {
      const next = await this.redis.zpopmin(this.waitingKey(input.concertId), 1);
      const userId = next[0];
      if (!userId) {
        break;
      }
      const expiresAt = new Date(
        input.now.getTime() + input.admissionTtlSeconds * 1000,
      );
      const token = randomUUID();
      const ttl = Math.max(1, input.admissionTtlSeconds);
      const record: AdmissionTokenRecord = {
        token,
        concertId: input.concertId,
        userId,
        expiresAt,
      };

      await this.redis
        .multi()
        .zadd(this.activeKey(input.concertId), expiresAt.getTime(), userId)
        .set(this.admissionKey(token), JSON.stringify(this.serializeAdmission(record)), 'EX', ttl)
        .set(this.userAdmissionKey(input.concertId, userId), token, 'EX', ttl)
        .exec();
      admitted.push(record);
    }

    return { admitted, expiredUserIds };
  }

  async validateAdmission(
    input: ValidateAdmissionInput,
  ): Promise<AdmissionTokenRecord | null> {
    const record = await this.readAdmission(input.token);
    if (!record) {
      return null;
    }
    if (
      record.concertId !== input.concertId ||
      record.userId !== input.userId ||
      record.expiresAt.getTime() <= input.now.getTime()
    ) {
      return null;
    }
    return record;
  }

  async releaseAdmissionSlot(input: {
    concertId: string;
    userId: string;
  }): Promise<void> {
    const reverseKey = this.userAdmissionKey(input.concertId, input.userId);
    const token = await this.redis.get(reverseKey);
    const multi = this.redis
      .multi()
      .del(reverseKey)
      .zrem(this.activeKey(input.concertId), input.userId);
    if (token) {
      multi.del(this.admissionKey(token));
    }
    await multi.exec();
  }

  async consumeAndHoldSlot(input: {
    concertId: string;
    userId: string;
    holdTtlMinutes: number;
  }): Promise<void> {
    const reverseKey = this.userAdmissionKey(input.concertId, input.userId);
    const token = await this.redis.get(reverseKey);
    const multi = this.redis.multi();
    
    if (token) {
      multi.del(reverseKey).del(this.admissionKey(token));
    }
    
    const expiresAt = Date.now() + input.holdTtlMinutes * 60 * 1000;
    multi.zadd(this.activeKey(input.concertId), 'XX', expiresAt, input.userId);
    
    await multi.exec();
  }

  async incrementLoad(concertId: string): Promise<number> {
    const key = this.loadCounterKey(concertId);
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, LOAD_COUNTER_TTL_SECONDS);
    }
    return count;
  }

  async updateLoadState(input: UpdateLoadStateInput): Promise<WaitingRoomLoadSnapshot> {
    const counter = Number((await this.redis.get(this.loadCounterKey(input.concertId))) ?? 0);
    const current = await this.readLoadState(input.concertId);
    let state = current.state;
    let lastBelowThresholdAt = current.lastBelowThresholdAt;

    if (counter >= input.activateThreshold) {
      state = 'ACTIVE';
      lastBelowThresholdAt = null;
    } else if (state === 'ACTIVE' && counter < input.deactivateThreshold) {
      lastBelowThresholdAt ??= input.now;
      const belowForMs = input.now.getTime() - lastBelowThresholdAt.getTime();
      if (belowForMs >= input.cooldownSeconds * 1000) {
        state = 'INACTIVE';
      }
    } else if (counter >= input.deactivateThreshold) {
      lastBelowThresholdAt = null;
    }

    await this.writeLoadState(input.concertId, {
      counter,
      state,
      lastBelowThresholdAt,
    });
    return { counter, state, lastBelowThresholdAt };
  }

  async readLoadState(concertId: string): Promise<WaitingRoomLoadSnapshot> {
    const [counterRaw, stateRaw, belowRaw] = await this.redis.mget(
      this.loadCounterKey(concertId),
      this.loadStateKey(concertId),
      this.loadLastBelowKey(concertId),
    );
    return {
      counter: Number(counterRaw ?? 0),
      state: stateRaw === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      lastBelowThresholdAt: belowRaw ? new Date(Number(belowRaw)) : null,
    };
  }

  async withConcertLock<T>(
    concertId: string,
    work: () => Promise<T>,
  ): Promise<T> {
    const key = this.lockKey(concertId);
    const value = randomUUID();
    const acquired = await this.redis.set(key, value, 'PX', LOCK_TTL_MS, 'NX');
    if (acquired !== 'OK') {
      return { admitted: [], expiredUserIds: [] } as T;
    }
    try {
      return await work();
    } finally {
      await this.redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        key,
        value,
      );
    }
  }

  private async reclaimExpired(concertId: string, now: Date): Promise<string[]> {
    const activeKey = this.activeKey(concertId);
    const expired = await this.redis.zrangebyscore(activeKey, '-inf', now.getTime());
    if (expired.length === 0) {
      return [];
    }
    const multi = this.redis.multi().zrem(activeKey, ...expired);
    for (const userId of expired) {
      const token = await this.redis.get(this.userAdmissionKey(concertId, userId));
      multi.del(this.userAdmissionKey(concertId, userId));
      if (token) {
        multi.del(this.admissionKey(token));
      }
    }
    await multi.exec();
    return expired;
  }

  private async readAdmissionForUser(
    concertId: string,
    userId: string,
  ): Promise<AdmissionTokenRecord | null> {
    const token = await this.redis.get(this.userAdmissionKey(concertId, userId));
    return token ? this.readAdmission(token) : null;
  }

  private async readAdmission(token: string): Promise<AdmissionTokenRecord | null> {
    const raw = await this.redis.get(this.admissionKey(token));
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as {
        token: string;
        concertId: string;
        userId: string;
        expiresAt: string;
      };
      return {
        token: parsed.token,
        concertId: parsed.concertId,
        userId: parsed.userId,
        expiresAt: new Date(parsed.expiresAt),
      };
    } catch {
      return null;
    }
  }

  private async writeLoadState(
    concertId: string,
    snapshot: WaitingRoomLoadSnapshot,
  ): Promise<void> {
    const multi = this.redis
      .multi()
      .set(this.loadStateKey(concertId), snapshot.state, 'EX', LOAD_STATE_TTL_SECONDS);
    if (snapshot.lastBelowThresholdAt) {
      multi.set(
        this.loadLastBelowKey(concertId),
        String(snapshot.lastBelowThresholdAt.getTime()),
        'EX',
        LOAD_STATE_TTL_SECONDS,
      );
    } else {
      multi.del(this.loadLastBelowKey(concertId));
    }
    await multi.exec();
  }

  private serializeAdmission(record: AdmissionTokenRecord): Record<string, string> {
    return {
      token: record.token,
      concertId: record.concertId,
      userId: record.userId,
      expiresAt: record.expiresAt.toISOString(),
    };
  }

  private toAdmittedStatus(
    concertId: string,
    userId: string,
    record: AdmissionTokenRecord,
  ): WaitingRoomQueueStatus {
    return {
      concertId,
      userId,
      active: true,
      status: 'ADMITTED',
      position: 0,
      admissionToken: record.token,
      admissionExpiresAt: record.expiresAt,
    };
  }

  private waitingKey(concertId: string): string {
    return `waiting:${concertId}`;
  }

  private activeKey(concertId: string): string {
    return `active:${concertId}`;
  }

  private admissionKey(token: string): string {
    return `admission:${token}`;
  }

  private userAdmissionKey(concertId: string, userId: string): string {
    return `admission:user:${concertId}:${userId}`;
  }

  private loadCounterKey(concertId: string): string {
    return `load:${concertId}:counter`;
  }

  private loadStateKey(concertId: string): string {
    return `load:${concertId}:state`;
  }

  private loadLastBelowKey(concertId: string): string {
    return `load:${concertId}:lastBelowThresholdAt`;
  }

  private lockKey(concertId: string): string {
    return `waiting-room:${concertId}:lock`;
  }
}
