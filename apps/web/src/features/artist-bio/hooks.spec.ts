import { describe, expect, it } from 'vitest';

import { artistBioKeys, artistBioRefetchInterval } from './hooks';

describe('artist bio query keys', () => {
  it('scopes cached artist bios by role and session identity', () => {
    const concertId = '22222222-2222-4222-8222-222222222222';
    expect(artistBioKeys.detail({ role: 'ORGANIZER', sub: 'organizer-a' }, concertId)).not.toEqual(
      artistBioKeys.detail({ role: 'ORGANIZER', sub: 'organizer-b' }, concertId),
    );
    expect(artistBioKeys.detail({ role: 'ADMIN', sub: '' }, concertId)).not.toEqual(
      artistBioKeys.detail({ role: 'ORGANIZER', sub: 'organizer-a' }, concertId),
    );
  });

  it('polls queued and processing work only', () => {
    expect(artistBioRefetchInterval({ status: 'DRAFT' } as never)).toBe(5_000);
    expect(artistBioRefetchInterval({ status: 'PROCESSING' } as never)).toBe(5_000);
    expect(artistBioRefetchInterval({ status: 'READY_FOR_REVIEW' } as never)).toBe(false);
    expect(artistBioRefetchInterval(null)).toBe(false);
  });
});
