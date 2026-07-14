import { describe, expect, it } from 'vitest';

import { vipLookupPresentation } from './vip-lookup-screen-state';

describe('VipLookupScreen result presentation', () => {
  it('renders found and not-found as distinct outcomes', () => {
    expect(
      vipLookupPresentation({
        status: 'found',
        guest: {
          id: '11111111-1111-4111-8111-111111111111',
          guestName: 'VIP Guest',
          externalRef: 'REF-1',
        },
      }),
    ).toMatchObject({ visible: true, tone: 'success', title: 'VIP found', message: 'VIP Guest' });
    expect(vipLookupPresentation({ status: 'not-found' })).toMatchObject({
      visible: true,
      tone: 'warning',
      title: 'VIP not found',
    });
  });

  it.each([
    ['offline', 'Online required'],
    ['authorization-error', 'Assignment not authorized'],
    ['validation-error', 'Check the lookup value'],
    ['service-error', 'Service unavailable'],
    ['network-error', 'Network error'],
    ['invalid-response', 'Unexpected response'],
  ] as const)('renders %s explicitly', (status, title) => {
    expect(vipLookupPresentation({ status, message: `message-${status}` })).toMatchObject({
      visible: true,
      title,
      message: `message-${status}`,
    });
  });

  it('hides result banners while idle or loading', () => {
    expect(vipLookupPresentation({ status: 'idle' }).visible).toBe(false);
    expect(vipLookupPresentation({ status: 'submitting' }).visible).toBe(false);
  });
});
