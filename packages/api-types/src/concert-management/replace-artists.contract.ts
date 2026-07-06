import { z } from 'zod';

export const ReplaceConcertArtistsItemSchema = z.object({
  artistId: z.string().uuid(),
  displayOrder: z.number().int().nonnegative(),
}).strict();
export type ReplaceConcertArtistsItem = z.infer<typeof ReplaceConcertArtistsItemSchema>;

export const ReplaceConcertArtistsRequestSchema = z.object({
  artists: z.array(ReplaceConcertArtistsItemSchema),
}).strict().superRefine((data, ctx) => {
  const artistIds = new Set<string>();
  const orders = new Set<number>();
  
  for (const artist of data.artists) {
    if (artistIds.has(artist.artistId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate artistId: ${artist.artistId}`,
        path: ['artists'],
      });
    }
    artistIds.add(artist.artistId);

    if (orders.has(artist.displayOrder)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate displayOrder: ${artist.displayOrder}`,
        path: ['artists'],
      });
    }
    orders.add(artist.displayOrder);
  }

  // Check contiguous orders starting at 0
  if (orders.size > 0) {
    const maxOrder = Math.max(...Array.from(orders));
    if (maxOrder !== orders.size - 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'displayOrder values must be contiguous starting from 0',
        path: ['artists'],
      });
    }
  }
});

export type ReplaceConcertArtistsRequest = z.infer<typeof ReplaceConcertArtistsRequestSchema>;
