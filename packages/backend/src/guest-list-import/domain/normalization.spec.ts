import { describe, expect, it } from 'vitest';
import {
  hasNaturalIdentifier,
  normalizeEmail,
  normalizeExternalRef,
  normalizePhone,
  sha256,
} from './normalization';

describe('guest-list normalization', () => {
  it('hashes deterministically and normalizes identifiers', () => {
    expect(sha256(Buffer.from('csv'))).toBe(sha256(Buffer.from('csv')));
    expect(normalizeEmail(' VIP@Example.COM ')).toBe('vip@example.com');
    expect(normalizePhone('090 123-4567')).toBe('+84901234567');
    expect(normalizePhone('+1 (415) 555-1212')).toBe('+14155551212');
    expect(normalizeExternalRef(' sponsor-1 ')).toBe('sponsor-1');
    expect(hasNaturalIdentifier({ normalizedPhone: '+84901234567' })).toBe(true);
  });
  it('rejects malformed identifiers', () => {
    expect(normalizeEmail('bad')).toBeUndefined();
    expect(normalizePhone('123')).toBeUndefined();
    expect(hasNaturalIdentifier({})).toBe(false);
  });
});
