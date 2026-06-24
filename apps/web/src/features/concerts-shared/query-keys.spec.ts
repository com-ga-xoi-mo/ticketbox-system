import { describe, it, expect } from 'vitest';
import { concertKeys, venueMapKeys } from './query-keys';

describe('query-keys', () => {
  it('creates stable list and detail keys scoped to the session', () => {
    const scope = { role: 'organizer', sub: 'user-1' };
    const listKey = concertKeys.list(scope);
    const detailKey = concertKeys.detail(scope, 'concert-123');

    expect(listKey).toEqual(['concerts', 'list', scope]);
    expect(detailKey).toEqual(['concerts', 'detail', scope, 'concert-123']);
  });

  it('creates stable venue map keys scoped to the session', () => {
    const scope = { role: 'organizer', sub: 'user-1' };
    const listKey = venueMapKeys.list(scope);
    const detailKey = venueMapKeys.detail(scope, 'concert-123');
    const editorKey = venueMapKeys.editor(scope, 'concert-123');

    expect(listKey).toEqual(['venueMaps', 'list', scope]);
    expect(detailKey).toEqual(['venueMaps', 'detail', scope, 'concert-123']);
    expect(editorKey).toEqual(['venueMaps', 'detail', scope, 'concert-123', 'editor']);
  });
});

