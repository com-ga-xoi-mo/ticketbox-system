export interface CacheRefreshInput {
  readonly onScanner: boolean;
  readonly authenticated: boolean;
  readonly online: boolean;
  readonly downloading: boolean;
}

/**
 * Pure predicate deciding whether a ticket-cache refresh should run now. A refresh is
 * only useful on the scanning context, while authenticated and online, and never while a
 * download is already in progress (single-flight is also enforced in the service).
 */
export function shouldRefreshCache(input: CacheRefreshInput): boolean {
  return input.onScanner && input.authenticated && input.online && !input.downloading;
}
