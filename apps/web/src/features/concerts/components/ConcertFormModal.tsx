import React, { useState, useEffect } from 'react';
import type { Concert } from '../types';
import {
  validateConcertForm,
  toCreatePayload,
  toUpdatePayload,
  type ConcertFormValues,
  type ConcertFormErrors,
} from '../concert-form';
import { useCreateConcertMutation, useUpdateConcertMutation } from '../hooks';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/ui/Dialog';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Textarea } from '../../../shared/ui/Textarea';

interface ConcertFormModalProps {
  concert?: Concert | null;
  onClose: () => void;
}

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
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());

  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

export function ConcertFormModal({ concert, onClose }: ConcertFormModalProps) {
  const isEdit = !!concert;
  const createMutation = useCreateConcertMutation();
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

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const titleValue = event.target.value;
    setValues((current) => {
      const next = { ...current, title: titleValue };
      if (!isEdit && !slugManuallyEdited) {
        next.slug = slugify(titleValue);
      }
      return next;
    });
  };

  const handleSlugChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    setValues((current) => ({ ...current, slug: event.target.value }));
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError('');

    const validationErrors = validateConcertForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    const onError = (error: Error) => {
      setSubmitError(error.message || 'An error occurred during submission.');
    };

    if (isEdit && concert) {
      updateMutation.mutate(
        {
          id: concert.id,
          payload: toUpdatePayload(values),
        },
        { onSuccess: onClose, onError },
      );
    } else {
      createMutation.mutate(toCreatePayload(values), { onSuccess: onClose, onError });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Concert' : 'Create Concert'}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close Concert Form">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">
              close
            </span>
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
            <Input
              id="concert-title"
              name="title"
              label="Concert Title *"
              value={values.title}
              onChange={handleTitleChange}
              error={errors.title}
              placeholder="Example: Midnight Symphony…"
              required
            />

            <Input
              id="concert-slug"
              name="slug"
              label="URL Slug *"
              value={values.slug}
              onChange={handleSlugChange}
              error={errors.slug}
              placeholder="Example: midnight-symphony…"
              className="font-mono"
              spellCheck={false}
              required
            />

            <Input
              id="concert-artist"
              name="artistName"
              label="Artist Name *"
              value={values.artistName}
              onChange={handleChange}
              error={errors.artistName}
              placeholder="Example: The Midnight Trio…"
              required
            />

            <Input
              id="concert-venue"
              name="venueName"
              label="Venue Name *"
              value={values.venueName}
              onChange={handleChange}
              error={errors.venueName}
              placeholder="Example: Grand Arena…"
              required
            />

            <Input
              id="concert-address"
              name="venueAddress"
              label="Venue Address"
              value={values.venueAddress}
              onChange={handleChange}
              error={errors.venueAddress}
              placeholder="Example: 123 Music Ave, Ward 1…"
            />

            <Input
              id="concert-city"
              name="city"
              label="City *"
              value={values.city}
              onChange={handleChange}
              error={errors.city}
              placeholder="Example: Ho Chi Minh City…"
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="concert-starts-at"
                type="datetime-local"
                name="startsAt"
                label="Starts At *"
                value={values.startsAt}
                onChange={handleChange}
                error={errors.startsAt}
                className="font-mono"
                autoComplete="off"
                required
              />

              <Input
                id="concert-ends-at"
                type="datetime-local"
                name="endsAt"
                label="Ends At *"
                value={values.endsAt}
                onChange={handleChange}
                error={errors.endsAt}
                className="font-mono"
                autoComplete="off"
                required
              />
            </div>

            <Textarea
              id="concert-description"
              name="description"
              label="Description"
              value={values.description}
              onChange={handleChange}
              error={errors.description}
              rows={3}
              placeholder="Describe the concert experience…"
            />

            {submitError && (
              <div className="pt-2 text-center text-xs font-semibold text-error" aria-live="polite">
                {submitError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              {isEdit ? 'Save Changes' : 'Create Concert'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
