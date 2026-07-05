import { z } from 'zod';

export const CreateResaleListingSchema = z.object({
  ticketId: z.string().uuid(),
  askingPriceVnd: z.number().int().positive(),
});

export type CreateResaleListingRequest = z.infer<typeof CreateResaleListingSchema>;

export const ResalePurchaseSchema = z.object({
  listingId: z.string().uuid(),
});

export type ResalePurchaseRequest = z.infer<typeof ResalePurchaseSchema>;
