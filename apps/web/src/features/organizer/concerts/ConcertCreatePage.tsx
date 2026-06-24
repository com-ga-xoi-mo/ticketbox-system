import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCreateConcertMutation, useUploadPosterMutation } from './hooks';
import { Badge } from '../../../shared/ui/badge';
import {
  validateConcertForm,
  toCreatePayload,
  type ConcertFormValues,
  type ConcertFormErrors,
} from '../../concerts-shared/concert-form';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { Textarea } from '../../../shared/ui/textarea';
import { cn } from '../../../shared/ui/cn';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
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

export function ConcertCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateConcertMutation();
  const uploadPosterMutation = useUploadPosterMutation();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
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

    createMutation.mutate(toCreatePayload(values), {
      onSuccess: (concert) => {
        if (posterFile) {
          uploadPosterMutation.mutate(
            { id: concert.id, file: posterFile },
            { onSettled: () => navigate(`/organizer/concerts/${concert.id}/edit`) },
          );
        } else {
          navigate(`/organizer/concerts/${concert.id}/edit`);
        }
      },
      onError: (err) => setSubmitError(err.message || 'Failed to create concert.'),
    });
  };

  const isPending = createMutation.isPending || uploadPosterMutation.isPending;

  const previewDate = values.startsAt
    ? new Date(values.startsAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const previewTime = values.startsAt
    ? new Date(values.startsAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }) + ' ICT'
    : null;

  const duration = (() => {
    if (!values.startsAt || !values.endsAt) return null;
    const diffMs = new Date(values.endsAt).getTime() - new Date(values.startsAt).getTime();
    if (diffMs <= 0 || isNaN(diffMs)) return null;
    const diffMins = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  })();

  return (
    <div className="min-h-full px-6 py-6 md:px-10 md:py-8">
      <form onSubmit={handleSubmit} noValidate>
        {/* Page Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/organizer/concerts"
              className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-surface-container-low text-on-surface-variant transition-colors hover:border-white/20 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Back to concerts"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </Link>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                Organizer — New Concert
              </p>
              <h2 className="font-display text-xl font-bold text-on-surface">
                {values.title || 'Untitled Concert'}
              </h2>
            </div>
          </div>
        </div>

        {/* Body: two columns on lg+ */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ── LEFT: Form sections ── */}
          <div className="flex flex-col gap-6">
            <FormSection icon="music_note" title="Event Details">
              <Input
                id="create-title"
                name="title"
                label="Concert Title *"
                value={values.title}
                onChange={handleTitleChange}
                error={errors.title}
                placeholder="e.g. Midnight Echo Live"
                required
              />

              <Input
                id="create-artist"
                name="artistName"
                label="Artist / Band *"
                value={values.artistName}
                onChange={handleChange}
                error={errors.artistName}
                placeholder="e.g. The Midnight Trio"
                icon="person"
                required
              />

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="create-slug"
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
                    id="create-slug"
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
                id="create-description"
                name="description"
                label="Description"
                value={values.description}
                onChange={handleChange}
                error={errors.description}
                rows={4}
                placeholder="Describe the concert experience, setlist highlights, special guests…"
              />
            </FormSection>

            <FormSection icon="location_on" title="Venue & Location">
              <Input
                id="create-venue"
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
                id="create-address"
                name="venueAddress"
                label="Address"
                value={values.venueAddress}
                onChange={handleChange}
                error={errors.venueAddress}
                placeholder="e.g. 123 Music Ave, Ward 1"
                icon="map"
              />

              <Input
                id="create-city"
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

            <FormSection icon="calendar_today" title="Schedule">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  id="create-starts-at"
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
                  id="create-ends-at"
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
                {posterPreview ? (
                  <img
                    src={posterPreview}
                    alt="Poster preview"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-on-surface-variant/30">
                    <span className="material-symbols-outlined text-5xl">image</span>
                    <span className="font-mono text-[11px] uppercase tracking-wider">No poster</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                  <Badge className="mb-2 text-[11px] shadow-sm bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Draft
                  </Badge>
                  <p className="break-words font-display text-base font-bold leading-normal text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
                    {values.title || <span className="text-white/30">Concert Title</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-white/60">
                    {values.artistName || <span className="text-white/20">Artist Name</span>}
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
                      {values.venueName || <span className="text-on-surface-variant/40">Venue Name</span>}
                    </p>
                    <p className="truncate text-xs text-on-surface-variant">
                      {values.city || <span className="text-on-surface-variant/40">City</span>}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-on-surface-variant">
                      calendar_today
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-on-surface">
                        {previewDate ?? '—'}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">{previewTime ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-on-surface-variant">
                      schedule
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-on-surface">Duration</p>
                      <p className="text-[11px] text-on-surface-variant">{duration ?? '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Media upload */}
            <div className="glass-panel rounded-xl p-5">
              <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      image
                    </span>
                  </div>
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider text-on-surface">
                    Media
                  </h3>
                </div>
                {posterPreview && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-medium text-primary transition-colors hover:text-primary-container"
                  >
                    Replace
                  </button>
                )}
              </div>

              <div
                className="group relative h-[160px] w-full cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-surface-container-low transition-colors hover:border-primary/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />

                {posterPreview ? (
                  <>
                    <img
                      src={posterPreview}
                      alt="Poster preview"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2">
                      <Badge className="bg-black/60 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-white backdrop-blur-md">
                        Primary Header
                      </Badge>
                    </div>
                    <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-white/70">
                      1920×1080
                    </div>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-on-surface-variant transition-colors group-hover:text-primary/70">
                    <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider">Upload Header</span>
                  </div>
                )}
              </div>
            </div>

            {/* Create / Cancel */}
            <div className="flex flex-col gap-2">
              <Button type="submit" loading={isPending} className="w-full justify-center">
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Create Concert
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/organizer/concerts')}
                disabled={isPending}
                className="w-full justify-center"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
