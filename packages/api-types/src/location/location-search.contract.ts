import { z } from 'zod';

/**
 * Location search query contract for GET /locations/search?q=<query>
 * Accessible to ADMIN and ORGANIZER roles only.
 */
export const LocationSearchQuerySchema = z
  .object({
    q: z
      .string()
      .transform((v) => v.trim())
      .pipe(z.string().min(3, 'Query must be at least 3 characters').max(200, 'Query must be at most 200 characters')),
  })
  .strict();
export type LocationSearchQuery = z.infer<typeof LocationSearchQuerySchema>;

export const LocationSearchResultSchema = z
  .object({
    displayName: z.string().min(1),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  })
  .strict();
export type LocationSearchResult = z.infer<typeof LocationSearchResultSchema>;

export const LocationSearchResponseSchema = z
  .object({
    results: z.array(LocationSearchResultSchema).max(5),
  })
  .strict();
export type LocationSearchResponse = z.infer<typeof LocationSearchResponseSchema>;
