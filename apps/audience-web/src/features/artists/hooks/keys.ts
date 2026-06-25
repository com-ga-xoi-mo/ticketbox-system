export const artistKeys = {
  all: ['artists'] as const,
  lists: () => [...artistKeys.all, 'list'] as const,
  list: (params: { q?: string; page?: number }) => [...artistKeys.lists(), params] as const,
  profiles: () => [...artistKeys.all, 'profile'] as const,
  profile: (slug: string) => [...artistKeys.profiles(), slug] as const,
  top: () => [...artistKeys.all, 'top'] as const,
};
