import { describe, expect, it } from 'vitest';

import { RedisWaitingRoomStore } from './redis-waiting-room.store';

class FakeRedis {
  strings = new Map<string, string>();
  zsets = new Map<string, Map<string, number>>();

  async zadd(key: string, ...args: unknown[]): Promise<number> {
    const set = this.zsets.get(key) ?? new Map<string, number>();
    this.zsets.set(key, set);
    const nx = args[0] === 'NX';
    const offset = nx ? 1 : 0;
    const score = Number(args[offset]);
    const member = String(args[offset + 1]);
    if (nx && set.has(member)) return 0;
    set.set(member, score);
    return 1;
  }

  async zrank(key: string, member: string): Promise<number | null> {
    const entries = this.sortedEntries(key);
    const index = entries.findIndex(([value]) => value === member);
    return index === -1 ? null : index;
  }

  async zpopmin(key: string): Promise<string[]> {
    const entries = this.sortedEntries(key);
    const [member, score] = entries[0] ?? [];
    if (!member) return [];
    this.zsets.get(key)?.delete(member);
    return [member, String(score)];
  }

  async zcard(key: string): Promise<number> {
    return this.zsets.get(key)?.size ?? 0;
  }

  async zrangebyscore(
    key: string,
    _min: string,
    max: number,
  ): Promise<string[]> {
    return this.sortedEntries(key)
      .filter(([, score]) => score <= max)
      .map(([member]) => member);
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    let removed = 0;
    const set = this.zsets.get(key);
    for (const member of members) {
      if (set?.delete(member)) removed += 1;
    }
    return removed;
  }

  async get(key: string): Promise<string | null> {
    return this.strings.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.strings.set(key, value);
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.strings.delete(key)) count += 1;
      if (this.zsets.delete(key)) count += 1;
    }
    return count;
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    return keys.map((key) => this.strings.get(key) ?? null);
  }

  async incr(key: string): Promise<number> {
    const next = Number(this.strings.get(key) ?? 0) + 1;
    this.strings.set(key, String(next));
    return next;
  }

  async expire(): Promise<number> {
    return 1;
  }

  async eval(): Promise<number> {
    return 1;
  }

  multi() {
    const strings = this.strings;
    const zsets = this.zsets;
    const zadd = this.zadd.bind({ strings, zsets, sortedEntries: this.sortedEntries });
    const zrem = this.zrem.bind({ strings, zsets, sortedEntries: this.sortedEntries });
    const del = this.del.bind({ strings, zsets, sortedEntries: this.sortedEntries });
    const set = this.set.bind({ strings, zsets, sortedEntries: this.sortedEntries });
    return {
      zadd(key: string, score: number, member: string) {
        void zadd(key, score, member);
        return this;
      },
      set(key: string, value: string) {
        void set(key, value);
        return this;
      },
      del(...keys: string[]) {
        void del(...keys);
        return this;
      },
      zrem(key: string, ...members: string[]) {
        void zrem(key, ...members);
        return this;
      },
      async exec() {
        return [];
      },
    };
  }

  private sortedEntries(key: string): [string, number][] {
    return [...(this.zsets.get(key) ?? new Map()).entries()].sort(
      (a, b) => a[1] - b[1],
    );
  }
}

function buildStore() {
  return new RedisWaitingRoomStore(new FakeRedis() as never);
}

describe('RedisWaitingRoomStore', () => {
  it('reports FIFO queue positions and admits up to the concurrency cap', async () => {
    const store = buildStore();
    const concertId = 'concert-1';

    await store.joinQueue({
      concertId,
      userId: 'user-1',
      joinedAt: new Date('2026-07-09T01:00:00.000Z'),
    });
    await store.joinQueue({
      concertId,
      userId: 'user-2',
      joinedAt: new Date('2026-07-09T01:00:01.000Z'),
    });

    await expect(
      store.getQueueStatus({ concertId, userId: 'user-2' }),
    ).resolves.toMatchObject({ status: 'WAITING', position: 2 });

    const result = await store.admitBatch({
      concertId,
      maxConcurrency: 1,
      admissionTtlSeconds: 60,
      now: new Date('2026-07-09T01:00:02.000Z'),
    });

    expect(result.admitted).toHaveLength(1);
    expect(result.admitted[0].userId).toBe('user-1');
    await expect(
      store.getQueueStatus({ concertId, userId: 'user-1' }),
    ).resolves.toMatchObject({ status: 'ADMITTED', position: 0 });
    await expect(
      store.getQueueStatus({ concertId, userId: 'user-2' }),
    ).resolves.toMatchObject({ status: 'WAITING', position: 1 });
  });

  it('validates tokens by user and concert, then reclaims expired slots', async () => {
    const store = buildStore();
    const concertId = 'concert-1';
    await store.joinQueue({
      concertId,
      userId: 'user-1',
      joinedAt: new Date('2026-07-09T01:00:00.000Z'),
    });
    await store.joinQueue({
      concertId,
      userId: 'user-2',
      joinedAt: new Date('2026-07-09T01:00:01.000Z'),
    });

    const first = await store.admitBatch({
      concertId,
      maxConcurrency: 1,
      admissionTtlSeconds: 5,
      now: new Date('2026-07-09T01:00:02.000Z'),
    });
    const token = first.admitted[0].token;

    await expect(
      store.validateAdmission({
        concertId,
        userId: 'user-1',
        token,
        now: new Date('2026-07-09T01:00:03.000Z'),
      }),
    ).resolves.toMatchObject({ userId: 'user-1', concertId });
    await expect(
      store.validateAdmission({
        concertId,
        userId: 'user-2',
        token,
        now: new Date('2026-07-09T01:00:03.000Z'),
      }),
    ).resolves.toBeNull();

    const second = await store.admitBatch({
      concertId,
      maxConcurrency: 1,
      admissionTtlSeconds: 5,
      now: new Date('2026-07-09T01:00:08.000Z'),
    });
    expect(second.expiredUserIds).toEqual(['user-1']);
    expect(second.admitted[0].userId).toBe('user-2');
  });

  it('keeps load active until the deactivate cooldown elapses', async () => {
    const store = buildStore();
    const concertId = 'concert-1';
    await store.incrementLoad(concertId);
    await store.incrementLoad(concertId);

    await expect(
      store.updateLoadState({
        concertId,
        activateThreshold: 2,
        deactivateThreshold: 1,
        cooldownSeconds: 10,
        now: new Date('2026-07-09T01:00:00.000Z'),
      }),
    ).resolves.toMatchObject({ state: 'ACTIVE' });

    const redis = (store as unknown as { redis: FakeRedis }).redis;
    redis.strings.set(`load:${concertId}:counter`, '0');

    await expect(
      store.updateLoadState({
        concertId,
        activateThreshold: 2,
        deactivateThreshold: 1,
        cooldownSeconds: 10,
        now: new Date('2026-07-09T01:00:05.000Z'),
      }),
    ).resolves.toMatchObject({ state: 'ACTIVE' });
    await expect(
      store.updateLoadState({
        concertId,
        activateThreshold: 2,
        deactivateThreshold: 1,
        cooldownSeconds: 10,
        now: new Date('2026-07-09T01:00:16.000Z'),
      }),
    ).resolves.toMatchObject({ state: 'INACTIVE' });
  });
});
