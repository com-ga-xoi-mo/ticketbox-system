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
