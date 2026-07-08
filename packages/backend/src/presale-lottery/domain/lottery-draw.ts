import type { LotteryRegistrationRecord } from './lottery.types';

/**
 * Deterministic FNV-1a hash of a string → unsigned 32-bit integer.
 * Pure and dependency-free so the draw can be reproduced anywhere from the seed.
 */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // hash *= 16777619 (FNV prime), kept in 32-bit range
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Produce a deterministic ordering of registrant ids for a given seed.
 * The same `seed` + registrant set always yields the same order, so a draw
 * can be re-run and independently verified. Ties break on registration id.
 */
export function orderRegistrantsBySeed(seed: string, registrationIds: string[]): string[] {
  return [...registrationIds].sort((a, b) => {
    const ha = fnv1a(`${seed}:${a}`);
    const hb = fnv1a(`${seed}:${b}`);
    if (ha !== hb) return ha - hb;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

export interface DrawSelectionInput {
  seed: string;
  registrations: LotteryRegistrationRecord[];
  /** Max ticket units to grant across all winners (already capped by inventory). */
  grantableUnits: number;
  maxPerUser: number;
  /** Remaining per-user allowance keyed by userId (from already reserved/sold). */
  remainingAllowanceByUser: Map<string, number>;
}

export interface DrawWinner {
  registrationId: string;
  userId: string;
  quantity: number;
}

export interface DrawSelectionResult {
  winners: DrawWinner[];
  notSelectedRegistrationIds: string[];
  allocationConsumed: number;
}

/**
 * Walk registrants in deterministic seeded order, granting winners until the
 * grantable unit budget is exhausted, respecting each registrant's desired
 * quantity and remaining per-user allowance. Pure — no side effects.
 */
export function selectWinners(input: DrawSelectionInput): DrawSelectionResult {
  const byId = new Map(input.registrations.map((r) => [r.id, r]));
  const orderedIds = orderRegistrantsBySeed(
    input.seed,
    input.registrations.map((r) => r.id),
  );

  let remaining = Math.max(input.grantableUnits, 0);
  const winners: DrawWinner[] = [];
  const notSelectedRegistrationIds: string[] = [];

  for (const id of orderedIds) {
    const registration = byId.get(id);
    if (!registration) continue;

    if (remaining <= 0) {
      notSelectedRegistrationIds.push(id);
      continue;
    }

    const allowance = input.remainingAllowanceByUser.get(registration.userId) ?? input.maxPerUser;
    const quantity = Math.min(registration.desiredQuantity, allowance, remaining);

    if (quantity <= 0) {
      notSelectedRegistrationIds.push(id);
      continue;
    }

    winners.push({ registrationId: id, userId: registration.userId, quantity });
    remaining -= quantity;
    input.remainingAllowanceByUser.set(registration.userId, allowance - quantity);
  }

  return {
    winners,
    notSelectedRegistrationIds,
    allocationConsumed: input.grantableUnits - remaining,
  };
}
