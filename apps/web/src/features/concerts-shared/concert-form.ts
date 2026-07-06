export interface ConcertFormValues {
  slug: string;
  title: string;
  artistName: string;
  venueName: string;
  venueAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
  city: string;
  startsAt: string;
  endsAt: string;
  description?: string;
  eventType?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoImageUrl?: string;
  isFeatured?: boolean;
  displayOrder?: number;
  linkedArtistIds?: string[]; // Simplified state for the artists
}

export type ConcertFormErrors = Partial<Record<keyof ConcertFormValues, string>>;

export function validateConcertForm(values: ConcertFormValues): ConcertFormErrors {
  const errors: ConcertFormErrors = {};

  if (!values.slug) {
    errors.slug = 'Slug is required';
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) {
    errors.slug = 'Slug must be URL-safe (lowercase alphanumeric and hyphens)';
  }

  if (!values.title) {
    errors.title = 'Title is required';
  }

  if (!values.artistName && (!values.linkedArtistIds || values.linkedArtistIds.length === 0)) {
    errors.artistName = 'Artist name or linked artist is required';
  }

  if (!values.venueName) {
    errors.venueName = 'Venue name is required';
  }

  if (!values.city) {
    errors.city = 'City is required';
  }

  if (!values.startsAt) {
    errors.startsAt = 'Start date/time is required';
  }

  if (!values.endsAt) {
    errors.endsAt = 'End date/time is required';
  }

  if (values.seoImageUrl && !/^https:\/\/.+/.test(values.seoImageUrl)) {
    errors.seoImageUrl = 'SEO image URL must be an absolute https:// URL';
  }

  if (values.startsAt && values.endsAt) {
    const start = new Date(values.startsAt);
    const end = new Date(values.endsAt);
    if (isNaN(start.getTime())) {
      errors.startsAt = 'Invalid start date/time';
    }
    if (isNaN(end.getTime())) {
      errors.endsAt = 'Invalid end date/time';
    }
    if (!errors.startsAt && !errors.endsAt && end <= start) {
      errors.endsAt = 'End date/time must be after start date/time';
    }
  }

  return errors;
}

// The shared contracts require full ISO-8601 datetimes with an offset, but the
// forms hold `datetime-local` values ("2026-07-16T18:18").
function toIsoDateTime(value: string): string {
  const date = new Date(value);
  return isNaN(date.getTime()) ? value : date.toISOString();
}

export function toCreatePayload(values: ConcertFormValues) {
  return {
    slug: values.slug,
    title: values.title,
    artistName: values.artistName,
    venueName: values.venueName,
    // venueAddress/description are non-nullable optionals in the contract: omit when empty.
    venueAddress: values.venueAddress || undefined,
    latitude: values.latitude ?? null,
    longitude: values.longitude ?? null,
    city: values.city,
    startsAt: toIsoDateTime(values.startsAt),
    endsAt: toIsoDateTime(values.endsAt),
    description: values.description || undefined,
    eventType: values.eventType || undefined,
    seoTitle: values.seoTitle || null,
    seoDescription: values.seoDescription || null,
    seoImageUrl: values.seoImageUrl || null,
    isFeatured: values.isFeatured,
    displayOrder: values.displayOrder,
  };
}

export function toUpdatePayload(values: ConcertFormValues) {
  return {
    slug: values.slug,
    title: values.title,
    artistName: values.artistName,
    venueName: values.venueName,
    venueAddress: values.venueAddress || undefined,
    latitude: values.latitude ?? null,
    longitude: values.longitude ?? null,
    city: values.city,
    startsAt: toIsoDateTime(values.startsAt),
    endsAt: toIsoDateTime(values.endsAt),
    description: values.description || undefined,
    eventType: values.eventType || undefined,
    seoTitle: values.seoTitle || null,
    seoDescription: values.seoDescription || null,
    seoImageUrl: values.seoImageUrl || null,
    isFeatured: values.isFeatured,
    displayOrder: values.displayOrder,
  };
}
