import { describe, it, expect } from 'vitest';
import {
  OrganizerCreateConcertSchema,
  OrganizerUpdateConcertSchema,
  AdminUpdateConcertSchema,
} from '@ticketbox/api-types';
import {
  validateConcertForm,
  toCreatePayload,
  toUpdatePayload,
  type ConcertFormValues,
} from './concert-form';

describe('concert form utilities', () => {
  const validValues = {
    slug: 'my-concert',
    title: 'My Concert',
    artistName: 'Artist 1',
    venueName: 'Venue 1',
    city: 'City 1',
    startsAt: '2026-07-01T20:00:00.000Z',
    endsAt: '2026-07-01T22:00:00.000Z',
    description: 'A great concert',
    latitude: 10.762622,
    longitude: 106.660172,
  };

  it('validates a correct form values successfully', () => {
    const errors = validateConcertForm(validValues);
    expect(Object.keys(errors).length).toBe(0);
  });

  it('detects missing required fields', () => {
    const errors = validateConcertForm({
      slug: '',
      title: '',
      artistName: '',
      venueName: '',
      city: '',
      startsAt: '',
      endsAt: '',
    });

    expect(errors.slug).toBeDefined();
    expect(errors.title).toBeDefined();
    expect(errors.artistName).toBeDefined();
    expect(errors.venueName).toBeDefined();
    expect(errors.city).toBeDefined();
    expect(errors.startsAt).toBeDefined();
    expect(errors.endsAt).toBeDefined();
  });

  it('validates slug format', () => {
    expect(validateConcertForm({ ...validValues, slug: 'Upper-Case' }).slug).toBeDefined();
    expect(validateConcertForm({ ...validValues, slug: 'invalid slug!' }).slug).toBeDefined();
    expect(
      validateConcertForm({ ...validValues, slug: 'consecutive--hyphens' }).slug,
    ).toBeDefined();
    expect(validateConcertForm({ ...validValues, slug: '-leading-hyphen' }).slug).toBeDefined();
    expect(validateConcertForm({ ...validValues, slug: 'trailing-hyphen-' }).slug).toBeDefined();
    expect(validateConcertForm({ ...validValues, slug: 'valid-slug-123' }).slug).toBeUndefined();
  });

  it('validates that endsAt is after startsAt', () => {
    const errors = validateConcertForm({
      ...validValues,
      startsAt: '2026-07-01T22:00:00.000Z',
      endsAt: '2026-07-01T20:00:00.000Z',
    });
    expect(errors.endsAt).toBe('End date/time must be after start date/time');
  });

  it('maps form values to create and update payloads correctly', () => {
    const values = {
      ...validValues,
      venueAddress: '',
      description: '',
    };

    const createPayload = toCreatePayload(values);
    expect(createPayload.venueAddress).toBeUndefined();
    expect(createPayload.description).toBeUndefined();

    // The wire contracts type these as non-nullable optionals, so empty
    // values must be omitted on update too — never sent as null.
    const updatePayload = toUpdatePayload(values);
    expect(updatePayload.venueAddress).toBeUndefined();
    expect(updatePayload.description).toBeUndefined();
  });
});

describe('concert form payloads satisfy the shared wire contracts', () => {
  // Values exactly as the form state holds them: datetime-local strings and
  // empty strings for untouched optional fields.
  const organizerFormValues: ConcertFormValues = {
    slug: 'midnight-echo-live',
    title: 'Midnight Echo Live',
    artistName: 'The Midnight',
    venueName: 'Grand Arena',
    venueAddress: '',
    city: 'Ho Chi Minh City',
    startsAt: '2026-07-16T18:18',
    endsAt: '2026-07-30T18:18',
    description: '',
    eventType: 'CONCERT',
    seoTitle: '',
    seoDescription: '',
    seoImageUrl: '',
  };

  const adminFormValues: ConcertFormValues = {
    ...organizerFormValues,
    isFeatured: true,
    displayOrder: 2,
  };

  // The payload crosses the network as JSON, which drops undefined keys —
  // mirror that before validating against the strict wire schemas.
  function asWirePayload(payload: unknown): Record<string, unknown> {
    return JSON.parse(JSON.stringify(payload));
  }

  it('organizer create payload passes OrganizerCreateConcertSchema', () => {
    expect(() =>
      OrganizerCreateConcertSchema.parse(asWirePayload(toCreatePayload(organizerFormValues))),
    ).not.toThrow();
  });

  it('organizer update payload passes OrganizerUpdateConcertSchema', () => {
    expect(() =>
      OrganizerUpdateConcertSchema.parse(asWirePayload(toUpdatePayload(organizerFormValues))),
    ).not.toThrow();
  });

  it('admin update payload passes AdminUpdateConcertSchema', () => {
    expect(() =>
      AdminUpdateConcertSchema.parse(asWirePayload(toUpdatePayload(adminFormValues))),
    ).not.toThrow();
  });

  it('converts datetime-local values to ISO datetimes with offset', () => {
    const payload = toUpdatePayload(organizerFormValues);
    expect(payload.startsAt).toMatch(/Z$/);
    expect(new Date(payload.startsAt).getTime()).toBe(new Date('2026-07-16T18:18').getTime());
  });

  it('organizer payload never contains moderation fields on the wire', () => {
    const payload = asWirePayload(toUpdatePayload(organizerFormValues));
    expect(payload).not.toHaveProperty('isFeatured');
    expect(payload).not.toHaveProperty('displayOrder');
  });

  it('rejects a non-https SEO image URL locally before submit', () => {
    const errors = validateConcertForm({
      ...organizerFormValues,
      seoImageUrl: 'http://insecure.example.com/x.png',
    });
    expect(errors.seoImageUrl).toBeTruthy();
  });
});
