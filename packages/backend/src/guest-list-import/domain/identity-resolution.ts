import type { ActiveGuestRecord, GuestIdentity } from './guest-list.types';

export type IdentityResolution =
  | { kind: 'none' }
  | { kind: 'match'; guest: ActiveGuestRecord }
  | { kind: 'conflict'; guestIds: string[] };

export function resolveIdentity(
  identity: GuestIdentity,
  candidates: ActiveGuestRecord[],
): IdentityResolution {
  const matched = candidates.filter(
    (candidate) =>
      (identity.normalizedEmail && candidate.normalizedEmail === identity.normalizedEmail) ||
      (identity.normalizedPhone && candidate.normalizedPhone === identity.normalizedPhone) ||
      (identity.externalRef && candidate.externalRef === identity.externalRef),
  );
  const unique = [...new Map(matched.map((guest) => [guest.id, guest])).values()];
  if (unique.length === 0) return { kind: 'none' };
  if (unique.length === 1) return { kind: 'match', guest: unique[0] };
  return { kind: 'conflict', guestIds: unique.map((guest) => guest.id).sort() };
}
