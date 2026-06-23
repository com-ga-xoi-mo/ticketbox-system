import React, { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useConcert, useUpdateConcertMutation, useConcertSession } from './hooks';
import {
  validateConcertForm,
  toUpdatePayload,
  type ConcertFormValues,
  type ConcertFormErrors,
} from './concert-form';
import { mapStatus } from './status';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Textarea } from '../../shared/ui/Textarea';
import { cn } from '../../shared/ui/cn';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function formatDateForInput(isoString?: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function FormSection({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel rounded-xl p-6">
      <div className="mb-5 flex items-center gap-3 border-b border-white/5 pb-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            {icon}
          </span>
        </div>
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-on-surface">
          {title}
        </h3>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

export function ConcertEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { role } = useConcertSession();
  const isAdmin = role === 'ADMIN';

  const { data: concert, isLoading, isError, error } = useConcert(id);
  const updateMutation = useUpdateConcertMutation();

  const [values, setValues] = useState<ConcertFormValues>({
    slug: '',
    title: '',
    artistName: '',
    venueName: '',
    venueAddress: '',
    city: '',
    startsAt: '',
    endsAt: '',
    description: '',
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [errors, setErrors] = useState<ConcertFormErrors>({});
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (concert) {
      setValues({
        slug: concert.slug,
        title: concert.title,
        artistName: concert.artistName,
        venueName: concert.venueName,
        venueAddress: concert.venueAddress || '',
        city: concert.city,
        startsAt: formatDateForInput(concert.startsAt),
        endsAt: formatDateForInput(concert.endsAt),
        description: concert.description || '',
      });
      setSlugManuallyEdited(true);
    }
  }, [concert]);

  if (!id) return <Navigate to="/concerts" replace />;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center" role="status">
        <div className="size-10 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
        <p className="mt-4 font-mono text-sm text-on-surface-variant">Loading concert…</p>
      </div>
    );
  }

  if (isError || !concert) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined mb-4 text-4xl text-error">error</span>
        <h3 className="font-display text-lg font-bold text-on-surface">Failed to load concert</h3>
        <p className="mt-2 max-w-sm text-sm text-on-surface-variant">
          {error?.message || 'The concert could not be loaded.'}
        </p>
        <Button onClick={() => navigate(-1)} className="mt-6">
          Go back
        </Button>
      </div>
    );
  }

  const canEdit = concert.status !== 'ENDED' && concert.status !== 'CANCELLED';
  if (!canEdit) return <Navigate to={`/concerts/${id}`} replace />;

  const { label, badgeClass, dotClass } = mapStatus(concert.status);
  const posterUrl = concert.posterAssetId
    ? `${API_BASE_URL}/assets/${concert.posterAssetId}`
    : null;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const titleValue = e.target.value;
    setValues((prev) => ({
      ...prev,
      title: titleValue,
      slug: slugManuallyEdited ? prev.slug : slugify(titleValue),
    }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    setValues((prev) => ({ ...prev, slug: e.target.value }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleDiscard = () => {
    navigate('/concerts');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const validationErrors = validateConcertForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    updateMutation.mutate(
      { id: concert.id, payload: toUpdatePayload(values) },
      {
        onSuccess: () => navigate('/concerts'),
        onError: (err) => setSubmitError(err.message || 'Failed to save changes.'),
      },
    );
  };

  const isPending = updateMutation.isPending;

  return (
    <div className="min-h-full px-6 py-6 md:px-10 md:py-8">
      <form onSubmit={handleSubmit} noValidate>
        {/* Page Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/concerts"
              className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-surface-container-low text-on-surface-variant transition-colors hover:border-white/20 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Back to concerts"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </Link>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                {isAdmin ? 'Admin — Editing Concert' : 'Organizer — Editing Concert'}
              </p>
              <h2 className="font-display text-xl font-bold text-on-surface">{concert.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={handleDiscard} disabled={isPending}>
              <span className="material-symbols-outlined text-[16px]">undo</span>
              Discard
            </Button>
            <Button type="submit" loading={isPending}>
              <span className="material-symbols-outlined text-[16px]">save</span>
              Save Changes
            </Button>
          </div>
        </div>

        {/* Body: two columns on lg+ */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ── LEFT: Form sections ── */}
          <div className="flex flex-col gap-6">
            {/* Event Details */}
            <FormSection icon="music_note" title="Event Details">
              <Input
                id="edit-title"
                name="title"
                label="Concert Title *"
                value={values.title}
                onChange={handleTitleChange}
                error={errors.title}
                placeholder="e.g. Midnight Echo Live"
                required
              />

              <Input
                id="edit-artist"
                name="artistName"
                label="Artist / Band *"
                value={values.artistName}
                onChange={handleChange}
                error={errors.artistName}
                placeholder="e.g. The Midnight Trio"
                icon="person"
                required
              />

              {/* Slug with prefix */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="edit-slug"
                  className="block font-label text-label-sm uppercase tracking-wider text-on-surface-variant"
                >
                  URL Slug *
                </label>
                <div
                  className={cn(
                    'flex items-center overflow-hidden rounded-lg border border-white/10 bg-surface-container-low transition-all focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/60',
                    errors.slug && 'border-error',
                  )}
                >
                  <span className="shrink-0 select-none border-r border-white/10 bg-surface-container-high/60 px-3 py-3 font-mono text-xs text-on-surface-variant">
                    ticketbox.com/
                  </span>
                  <input
                    id="edit-slug"
                    name="slug"
                    value={values.slug}
                    onChange={handleSlugChange}
                    placeholder="midnight-echo-live"
                    className="min-w-0 flex-1 bg-transparent px-3 py-3 font-mono text-sm text-on-surface placeholder:text-outline focus:outline-none"
                    spellCheck={false}
                    required
                    aria-invalid={!!errors.slug}
                  />
                </div>
                {errors.slug && <p className="text-xs font-medium text-error">{errors.slug}</p>}
              </div>

              <Textarea
                id="edit-description"
                name="description"
                label="Description"
                value={values.description}
                onChange={handleChange}
                error={errors.description}
                rows={4}
                placeholder="Describe the concert experience, setlist highlights, special guests…"
              />
            </FormSection>

            {/* Venue & Location */}
            <FormSection icon="location_on" title="Venue & Location">
              <Input
                id="edit-venue"
                name="venueName"
                label="Venue Name *"
                value={values.venueName}
                onChange={handleChange}
                error={errors.venueName}
                placeholder="e.g. Grand Arena"
                icon="apartment"
                required
              />

              <Input
                id="edit-address"
                name="venueAddress"
                label="Address"
                value={values.venueAddress}
                onChange={handleChange}
                error={errors.venueAddress}
                placeholder="e.g. 123 Music Ave, Ward 1"
                icon="map"
              />

              <Input
                id="edit-city"
                name="city"
                label="City *"
                value={values.city}
                onChange={handleChange}
                error={errors.city}
                placeholder="e.g. Ho Chi Minh City"
                icon="location_city"
                required
              />
            </FormSection>

            {/* Schedule */}
            <FormSection icon="calendar_today" title="Schedule">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  id="edit-starts-at"
                  type="datetime-local"
                  name="startsAt"
                  label="Event Start *"
                  value={values.startsAt}
                  onChange={handleChange}
                  error={errors.startsAt}
                  className="font-mono"
                  autoComplete="off"
                  required
                />
                <Input
                  id="edit-ends-at"
                  type="datetime-local"
                  name="endsAt"
                  label="Event End *"
                  value={values.endsAt}
                  onChange={handleChange}
                  error={errors.endsAt}
                  className="font-mono"
                  autoComplete="off"
                  required
                />
              </div>
            </FormSection>

            {submitError && (
              <p className="text-center text-sm font-semibold text-error" aria-live="polite">
                {submitError}
              </p>
            )}
          </div>

          {/* ── RIGHT: Preview sidebar ── */}
          <div className="flex flex-col gap-4">
            {/* Poster Preview */}
            <div className="glass-panel overflow-hidden rounded-xl">
              <div className="relative min-h-[200px] w-full bg-gradient-to-br from-primary/20 via-surface-container to-tertiary/10">
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={concert.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-on-surface-variant/30">
                    <span className="material-symbols-outlined text-5xl">image</span>
                    <span className="font-mono text-[11px] uppercase tracking-wider">No poster</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                  <Badge className={cn('mb-2 text-[11px] shadow-sm', badgeClass)}>
                    {dotClass && <span className={cn('size-1.5 rounded-full', dotClass)} />}
                    {label}
                  </Badge>
                  <p className="break-words font-display text-base font-bold leading-tight text-white drop-shadow">
                    {values.title || concert.title}
                  </p>
                  <p className="mt-0.5 text-xs text-white/60">
                    {values.artistName || concert.artistName}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 p-5">
                <div className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined shrink-0 text-[18px] text-on-surface-variant">
                    location_on
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-on-surface">
                      {values.venueName || concert.venueName}
                    </p>
                    <p className="truncate text-xs text-on-surface-variant">
                      {values.city || concert.city}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined shrink-0 text-[18px] text-on-surface-variant">
                    calendar_today
                  </span>
                  <p className="font-mono text-xs text-on-surface-variant">
                    {values.startsAt
                      ? new Date(values.startsAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Setup Progress */}
            <div className="glass-panel rounded-xl p-5">
              <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Setup Progress
              </p>
              <div className="flex flex-col gap-3">
                {[
                  {
                    label: 'Seating Map',
                    done: !!concert.seatingMapConfigured,
                    value: concert.seatingMapConfigured ? 'Configured' : 'Pending',
                  },
                  {
                    label: 'Seating Zones',
                    done: !!concert.seatingZonesCount,
                    value: concert.seatingZonesCount
                      ? `${concert.seatingZonesCount} zones`
                      : 'Pending',
                  },
                  {
                    label: 'Ticket Types',
                    done: !!concert.ticketTypesCount,
                    value: concert.ticketTypesCount
                      ? `${concert.ticketTypesCount} types`
                      : 'Pending',
                  },
                  {
                    label: 'Check-in Staff',
                    done: !!concert.checkinStaffCount,
                    value: `${concert.checkinStaffCount || 0} assigned`,
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">{row.label}</span>
                    <div
                      className={cn(
                        'flex items-center gap-1.5',
                        row.done ? 'text-emerald-400' : 'text-on-surface-variant/50',
                      )}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {row.done ? 'check_circle' : 'pending'}
                      </span>
                      <span className="text-xs font-medium">{row.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save / Discard repeated at bottom */}
            <div className="flex flex-col gap-2">
              <Button type="submit" loading={isPending} className="w-full justify-center">
                <span className="material-symbols-outlined text-[16px]">save</span>
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDiscard}
                disabled={isPending}
                className="w-full justify-center"
              >
                <span className="material-symbols-outlined text-[16px]">undo</span>
                Discard
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
