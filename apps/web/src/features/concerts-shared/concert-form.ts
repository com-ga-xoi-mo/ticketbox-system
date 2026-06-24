export interface ConcertFormValues {
  slug: string;
  title: string;
  artistName: string;
  venueName: string;
  venueAddress?: string;
  city: string;
  startsAt: string;
  endsAt: string;
  description?: string;
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

  if (!values.artistName) {
    errors.artistName = 'Artist name is required';
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

export function toCreatePayload(values: ConcertFormValues) {
  return {
    slug: values.slug,
    title: values.title,
    artistName: values.artistName,
    venueName: values.venueName,
    venueAddress: values.venueAddress || undefined,
    city: values.city,
    startsAt: values.startsAt,
    endsAt: values.endsAt,
    description: values.description || undefined,
  };
}

export function toUpdatePayload(values: ConcertFormValues) {
  return {
    slug: values.slug,
    title: values.title,
    artistName: values.artistName,
    venueName: values.venueName,
    venueAddress: values.venueAddress || null,
    city: values.city,
    startsAt: values.startsAt,
    endsAt: values.endsAt,
    description: values.description || null,
  };
}
