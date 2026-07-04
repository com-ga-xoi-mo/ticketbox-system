import type { ManagementConcertResponse } from '@ticketbox/api-types';
import type { Concert } from '../../domain/concert.types';

export function mapToManagementConcertResponse(concert: Concert): ManagementConcertResponse {
  return {
    id: concert.id,
    slug: concert.slug,
    title: concert.title,
    artistName: concert.artistName,
    description: concert.description,
    venueName: concert.venueName,
    venueAddress: concert.venueAddress,
    latitude: concert.latitude,
    longitude: concert.longitude,
    city: concert.city,
    startsAt: concert.startsAt.toISOString(),
    endsAt: concert.endsAt.toISOString(),
    status: concert.status as any,
    eventType: concert.eventType as any,
    isFeatured: concert.isFeatured,
    displayOrder: concert.displayOrder,
    seoTitle: concert.seoTitle,
    seoDescription: concert.seoDescription,
    seoImageUrl: concert.seoImageUrl,
    createdById: concert.createdById,
    posterAssetId: concert.posterAssetId,
    bannerAssetId: concert.bannerAssetId,
    seatingMapAssetId: concert.seatingMapAssetId,
    posterAsset: (concert.posterAsset as any) ?? null,
    bannerAsset: (concert.bannerAsset as any) ?? null,
    artists:
      concert.artists?.map((a) => ({
        id: a.id,
        slug: a.slug,
        displayName: a.displayName,
        status: a.status as any,
        displayOrder: a.displayOrder,
        avatarAsset: (a.avatarAsset as any) ?? null,
      })) ?? [],
    ticketTypesCount: concert.ticketTypesCount,
    seatingZonesCount: concert.seatingZonesCount,
    checkinStaffCount: concert.checkinStaffCount,
    seatingMapConfigured: concert.seatingMapConfigured,
    createdAt: concert.createdAt.toISOString(),
    updatedAt: concert.updatedAt.toISOString(),
    publishedAt: concert.publishedAt ? concert.publishedAt.toISOString() : null,
    cancelledAt: concert.cancelledAt ? concert.cancelledAt.toISOString() : null,
  };
}
