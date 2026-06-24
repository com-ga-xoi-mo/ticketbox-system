export type AssetMetadata = {
  id: string;
  kind: string;
  status: string;
  publicUrl: string | null;
  originalName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
};

export type SeatingZoneCatalogItem = {
  id: string;
  svgElementId: string;
  label: string;
  color: string | null;
  displayOrder: number;
  status: string;
};

export type TicketTypeCatalogItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceVnd: number;
  totalQuantity: number;
  availableQuantity: number;
  maxPerUser: number;
  saleStartsAt: Date;
  saleEndsAt: Date;
  status: string;
  zoneIds: string[];
};

export type TicketTypeZoneMapping = {
  ticketTypeId: string;
  seatingZoneId: string;
};

export type AvailabilityTicketTypeSnapshot = {
  ticketTypeId: string;
  code: string;
  name: string;
  totalQuantity: number;
  availableQuantity: number;
  status: string;
  saleStartsAt: Date;
  saleEndsAt: Date;
  zoneIds: string[];
};

export type ConcertAvailabilitySnapshot = {
  concertId: string;
  slug: string;
  generatedAt: Date;
  ticketTypes: AvailabilityTicketTypeSnapshot[];
};

export type ConcertAvailabilitySummary = {
  totalAvailableQuantity: number;
  minPriceVnd: number | null;
  maxPriceVnd: number | null;
  ticketTypeCount: number;
};

export type ConcertSummary = {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  venueName: string;
  city: string;
  startsAt: Date;
  endsAt: Date;
  posterAsset: AssetMetadata | null;
  availabilitySummary: ConcertAvailabilitySummary;
};

export type ConcertDetail = {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  description: string | null;
  publishedArtistBio: string | null;
  venueName: string;
  venueAddress: string | null;
  city: string;
  startsAt: Date;
  endsAt: Date;
  posterAsset: AssetMetadata | null;
  seatingMapAsset: AssetMetadata | null;
  seatingZones: SeatingZoneCatalogItem[];
  ticketTypes: TicketTypeCatalogItem[];
  ticketTypeZoneMappings: TicketTypeZoneMapping[];
};

export type CatalogSearchFilters = {
  q?: string;
  city?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'date' | 'price';
  sortDir?: 'asc' | 'desc';
};
