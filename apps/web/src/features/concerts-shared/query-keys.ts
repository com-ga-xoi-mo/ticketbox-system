export interface QueryScope {
  role: string;
  sub: string;
}

export const concertKeys = {
  all: ['concerts'] as const,
  lists: () => [...concertKeys.all, 'list'] as const,
  list: (scope: QueryScope) => [...concertKeys.lists(), scope] as const,
  details: () => [...concertKeys.all, 'detail'] as const,
  detail: (scope: QueryScope, id: string) => [...concertKeys.details(), scope, id] as const,
};

export const venueMapKeys = {
  all: ['venueMaps'] as const,
  lists: () => [...venueMapKeys.all, 'list'] as const,
  list: (scope: QueryScope) => [...venueMapKeys.lists(), scope] as const,
  details: () => [...venueMapKeys.all, 'detail'] as const,
  detail: (scope: QueryScope, id: string) => [...venueMapKeys.details(), scope, id] as const,
  editor: (scope: QueryScope, id: string) => [...venueMapKeys.detail(scope, id), 'editor'] as const,
};

