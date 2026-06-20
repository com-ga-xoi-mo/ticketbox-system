import { describe, it, expect } from 'vitest';
import { concertKeys } from './query-keys';

describe('query-keys', () => {
  it('creates stable list and detail keys scoped to the session', () => {
    const scope = { role: 'organizer', sub: 'user-1' };
    const listKey = concertKeys.list(scope);
    const detailKey = concertKeys.detail(scope, 'concert-123');

    expect(listKey).toEqual(['concerts', 'list', scope]);
    expect(detailKey).toEqual(['concerts', 'detail', scope, 'concert-123']);
  });
});
