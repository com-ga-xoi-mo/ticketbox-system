import { describe, it, expect } from 'vitest';
import { validateConcertForm, toCreatePayload, toUpdatePayload } from './concert-form';

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

    const updatePayload = toUpdatePayload(values);
    expect(updatePayload.venueAddress).toBeNull();
    expect(updatePayload.description).toBeNull();
  });
});
