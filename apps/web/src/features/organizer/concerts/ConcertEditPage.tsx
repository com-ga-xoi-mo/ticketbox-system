import React, { useState, useEffect, useRef } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useConcert, useUpdateConcertMutation, useUploadPosterMutation, useUploadBannerMutation, useReplaceArtistsMutation } from './hooks';
import {
  validateConcertForm,
  toUpdatePayload,
  type ConcertFormValues,
  type ConcertFormErrors,
} from '../../concerts-shared/concert-form';
import { mapStatus } from '../../concerts-shared/status';
import { resolveConcertPosterUrl } from '../../concerts-shared/concert-image';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { Textarea } from '../../../shared/ui/textarea';
import { cn } from '../../../shared/ui/cn';
import { ArtistSelector } from '../../concerts-shared/ui/ArtistSelector';
import { toast } from 'sonner';

import { VenueLocationPicker } from '../../concerts-shared/components/VenueLocationPicker';

import { getAssetUrl } from '../../../shared/api/client';

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

  const { data: concert, isLoading, isError, error } = useConcert(id);
  const updateMutation = useUpdateConcertMutation();
  const uploadPosterMutation = useUploadPosterMutation();
  const uploadBannerMutation = useUploadBannerMutation();
  const replaceArtistsMutation = useReplaceArtistsMutation();

  const [values, setValues] = useState<ConcertFormValues>({
    slug: '',
    title: '',
    artistName: '',
    venueName: '',
    venueAddress: '',
    latitude: null,
    longitude: null,
    city: '',
    startsAt: '',
    endsAt: '',
    description: '',
    eventType: 'CONCERT',
    seoTitle: '',
    seoDescription: '',
    seoImageUrl: '',
  });
  const [selectedArtists, setSelectedArtists] = useState<{ artistId: string; displayName: string; avatarUrl: string | null; status: string }[]>([]);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [errors, setErrors] = useState<ConcertFormErrors>({});
  const [submitError, setSubmitError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (concert) {
      setValues({
        slug: concert.slug,
        title: concert.title,
        artistName: concert.artistName,
        venueName: concert.venueName,
        venueAddress: concert.venueAddress || '',
        latitude: concert.latitude ?? null,
        longitude: concert.longitude ?? null,
        city: concert.city,
        startsAt: formatDateForInput(concert.startsAt),
        endsAt: formatDateForInput(concert.endsAt),
        description: concert.description || '',
        eventType: concert.eventType,
        seoTitle: concert.seoTitle || '',
        seoDescription: concert.seoDescription || '',
        seoImageUrl: concert.seoImageUrl || '',
      });
      setSelectedArtists(
        concert.artists?.map((a: any) => ({
          artistId: a.id,
          displayName: a.displayName,
          avatarUrl: a.avatarAsset?.publicUrl || null,
          status: a.status,
        })) || []
      );
      setSlugManuallyEdited(true);
    }
  }, [concert]);

  if (!id) return <Navigate to="/organizer/concerts" replace />;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center" role="status">
        <div className="size-10 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
        <p className="mt-4 font-mono text-sm text-on-surface-variant">Đang tải sự kiện…</p>
      </div>
    );
  }

  if (isError || !concert) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined mb-4 text-4xl text-error">error</span>
        <h3 className="font-display text-lg font-bold text-on-surface">Tải sự kiện thất bại</h3>
        <p className="mt-2 max-w-sm text-sm text-on-surface-variant">
          {error?.message || 'Không thể tải sự kiện.'}
        </p>
        <Button onClick={() => navigate(-1)} className="mt-6">
          Go back
        </Button>
      </div>
    );
  }

  const canEdit = concert.status !== 'ENDED' && concert.status !== 'CANCELLED';
  if (!canEdit) return <Navigate to={`/organizer/concerts/${id}`} replace />;

  const { label, variant, dotClass } = mapStatus(concert.status);
  const posterUrl = resolveConcertPosterUrl(concert);

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
    navigate('/organizer/concerts');
  };

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && concert) {
      uploadPosterMutation.mutate(
        { id: concert.id, file },
        {
          onError: (err) => setSubmitError(err.message || 'Failed to upload poster.'),
        }
      );
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && concert) {
      uploadBannerMutation.mutate(
        { id: concert.id, file },
        {
          onError: (err) => setSubmitError(err.message || 'Failed to upload banner.'),
        }
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const validationErrors = validateConcertForm({ ...values, linkedArtistIds: selectedArtists.map(a => a.artistId) });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    const primaryArtist = selectedArtists[0];
    const basePayload = toUpdatePayload({
      ...values,
      artistName: primaryArtist ? primaryArtist.displayName : values.artistName,
    });

    updateMutation.mutate(
      { id: concert.id, payload: basePayload },
      {
        onSuccess: () => {
          replaceArtistsMutation.mutate(
            {
              id: concert.id,
              payload: {
                artists: selectedArtists.map((a, i) => ({ artistId: a.artistId, displayOrder: i })),
              },
            },
            {
              onSuccess: () => {
                toast.success('Lưu thông tin sự kiện thành công');
                navigate('/organizer/concerts');
              },
              onError: (err) => setSubmitError(err.message || 'Failed to update linked artists.'),
            }
          );
        },
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
              to="/organizer/concerts"
              className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-surface-container-low text-on-surface-variant transition-colors hover:border-white/20 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Back to concerts"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </Link>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                Ban tổ chức — Chỉnh sửa sự kiện
              </p>
              <h2 className="font-display text-xl font-bold text-on-surface">{concert.title}</h2>
            </div>
          </div>
        </div>

        {/* Body: two columns on lg+ */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ── LEFT: Form sections ── */}
          <div className="flex flex-col gap-6">
            {/* Event Details */}
            <FormSection icon="music_note" title="Chi tiết sự kiện">
              <Input
                id="edit-title"
                name="title"
                label="Tiêu đề sự kiện *"
                value={values.title}
                onChange={handleTitleChange}
                error={errors.title}
                placeholder="VD: Đêm nhạc Mùa xuân"
                required
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-label text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">
                    Event Type
                  </label>
                  <select
                    name="eventType"
                    value={values.eventType}
                    onChange={(e) => setValues(prev => ({ ...prev, eventType: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-white/10 bg-surface-container px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="CONCERT">Sự kiện âm nhạc</option>
                    <option value="WORKSHOP">Hội thảo</option>
                    <option value="SPORT">Thể thao</option>
                    <option value="MOVIE">Phim</option>
                    <option value="THEATRE">Kịch</option>
                    <option value="VOUCHER">Voucher</option>
                  </select>
                </div>
              </div>

              {selectedArtists.length === 0 && (
                <Input
                  id="edit-artist"
                  name="artistName"
                  label="Nghệ sĩ / Ban nhạc *"
                  value={values.artistName}
                  onChange={handleChange}
                  error={errors.artistName}
                  placeholder="VD: Ban nhạc Bức Tường"
                  icon="person"
                  required
                />
              )}

              <div>
                <label className="block font-label text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">
                  Linked Artists
                </label>
                <ArtistSelector selectedArtists={selectedArtists} onChange={setSelectedArtists} />
              </div>

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
                label="Mô tả"
                value={values.description}
                onChange={handleChange}
                error={errors.description}
                rows={4}
                placeholder="Mô tả trải nghiệm sự kiện, các tiết mục nổi bật, khách mời đặc biệt…"
              />
            </FormSection>

            {/* Venue & Location */}
            <FormSection icon="location_on" title="Địa điểm & Vị trí">
              <Input
                id="edit-venue"
                name="venueName"
                label="Tên địa điểm *"
                value={values.venueName}
                onChange={handleChange}
                error={errors.venueName}
                placeholder="VD: Sân vận động Quân khu 7"
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

              <div>
                <p className="mb-1 text-sm font-medium">Vị trí trên bản đồ</p>
                <VenueLocationPicker
                  latitude={values.latitude}
                  longitude={values.longitude}
                  venueAddress={values.venueAddress}
                  onChange={({ latitude, longitude, venueAddress }) =>
                    setValues((v) => ({
                      ...v,
                      latitude,
                      longitude,
                      venueAddress: venueAddress ?? v.venueAddress,
                    }))
                  }
                />
              </div>

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
                  label="Thời gian kết thúc *"
                  value={values.endsAt}
                  onChange={handleChange}
                  error={errors.endsAt}
                  className="font-mono"
                  autoComplete="off"
                  required
                />
              </div>
            </FormSection>

            {/* SEO Metadata */}
            <FormSection icon="search" title="Tối ưu tìm kiếm (SEO)">
              <p className="-mt-1 text-xs text-on-surface-variant">
                Bạn có thể bỏ qua phần này. Hệ thống sẽ tự động dùng tiêu đề, mô tả và poster của sự kiện để hiển thị khi link được chia sẻ lên mạng xã hội (Facebook, Zalo...) hoặc trên Google.
              </p>
              <Input
                id="edit-seo-title"
                name="seoTitle"
                label="Tiêu đề (khi chia sẻ link)"
                value={values.seoTitle}
                onChange={handleChange}
                placeholder={values.title ? `Tự động: "${values.title} | Ticketbox"` : 'Tự động lấy theo tên sự kiện'}
              />
              <Textarea
                id="edit-seo-desc"
                name="seoDescription"
                label="Mô tả ngắn"
                value={values.seoDescription}
                onChange={handleChange}
                rows={2}
                placeholder={values.description ? `Tự động: "${values.description.substring(0, 80)}…"` : 'Tự động trích xuất từ phần Mô tả sự kiện'}
              />
              <Input
                id="edit-seo-image"
                name="seoImageUrl"
                label="Ảnh Thumbnail (URL)"
                value={values.seoImageUrl}
                onChange={handleChange}
                error={errors.seoImageUrl}
                placeholder="Link ảnh (https://...). Để trống sẽ tự dùng Poster."
              />
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
                    <span className="font-mono text-[11px] uppercase tracking-wider">Không có poster</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                  <Badge variant={variant} className="mb-2 text-[11px] shadow-sm">
                    {dotClass && <span className={cn('size-1.5 rounded-full', dotClass)} />}
                    {label}
                  </Badge>
                  <p className="break-words font-display text-base font-bold leading-normal text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-on-surface-variant">
                      calendar_today
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-on-surface">
                        {values.startsAt
                          ? new Date(values.startsAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        {values.startsAt
                          ? new Date(values.startsAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            }) + ' ICT'
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-on-surface-variant">
                      schedule
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-on-surface">Thời lượng</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {(() => {
                          if (!values.startsAt || !values.endsAt) return '—';
                          const diffMs = new Date(values.endsAt).getTime() - new Date(values.startsAt).getTime();
                          if (diffMs <= 0 || isNaN(diffMs)) return '—';
                          const diffMins = Math.floor(diffMs / 60000);
                          const h = Math.floor(diffMins / 60);
                          const m = diffMins % 60;
                          if (h > 0 && m > 0) return `${h}h ${m}m`;
                          if (h > 0) return `${h}h`;
                          return `${m}m`;
                        })()}
                      </p>
                    </div>
                  </div>
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
                    label: 'Bản đồ chỗ ngồi',
                    done: !!concert.seatingMapConfigured,
                    value: concert.seatingMapConfigured ? 'Đã cấu hình' : 'Đang chờ',
                  },
                  {
                    label: 'Khu vực ghế ngồi',
                    done: !!concert.seatingZonesCount,
                    value: concert.seatingZonesCount
                      ? `${concert.seatingZonesCount} khu vực`
                      : 'Đang chờ',
                  },
                  {
                    label: 'Loại vé',
                    done: !!concert.ticketTypesCount,
                    value: concert.ticketTypesCount
                      ? `${concert.ticketTypesCount} loại`
                      : 'Đang chờ',
                  },
                  {
                    label: 'Nhân viên check-in',
                    done: !!concert.checkinStaffCount,
                    value: `${concert.checkinStaffCount || 0} đã phân công`,
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
              <div className="mt-4 border-t border-white/5 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center"
                  onClick={() => {
                    if (concert.status !== 'DRAFT') {
                      alert('Sự kiện này không còn ở trạng thái BẢN NHÁP. Bạn sẽ chỉ có thể xem bản đồ địa điểm.');
                    }
                    navigate(`/organizer/venue-maps/${concert.id}`);
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]">map</span>
                  {concert.status === 'DRAFT' ? 'Edit Venue Map' : 'View Venue Map'}
                </Button>
              </div>
            </div>

            {/* Media Section */}
            <div className="glass-panel rounded-xl p-5">
              <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      image
                    </span>
                  </div>
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider text-on-surface">Đa phương tiện</h3>
                </div>
                {posterUrl && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-medium text-primary transition-colors hover:text-primary-container"
                  >Thay thế</button>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {/* Banner Upload Area */}
                <h4 className="text-sm font-semibold">Banner (Ảnh nổi bật)</h4>
                <div 
                  className="group relative h-[100px] w-full cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-surface-container-low transition-colors hover:border-primary/50"
                  onClick={() => bannerInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={bannerInputRef} 
                    className="hidden" 
                    accept="image/jpeg,image/png,image/webp" 
                    onChange={handleBannerChange}
                  />

                  {uploadBannerMutation.isPending && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                      <div className="size-6 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
                    </div>
                  )}

                  {concert.bannerAsset?.publicUrl ? (
                    <img
                      src={concert.bannerAsset.publicUrl}
                      alt="Banner"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-on-surface-variant transition-colors group-hover:text-primary/70">
                      <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider">Tải lên Banner</span>
                    </div>
                  )}
                </div>

                {/* Primary Header Upload Area */}
                <h4 className="text-sm font-semibold mt-2">Poster (Khổ dọc)</h4>
                <div 
                  className="group relative h-[160px] w-full cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-surface-container-low transition-colors hover:border-primary/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/jpeg,image/png,image/webp" 
                    onChange={handlePosterChange}
                  />

                  {uploadPosterMutation.isPending && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                      <div className="size-6 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
                    </div>
                  )}

                  {posterUrl ? (
                    <>
                      <img
                        src={posterUrl}
                        alt="Primary Header"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2 flex items-center gap-2">
                        <Badge className="bg-black/60 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-white backdrop-blur-md">Ảnh đại diện chính</Badge>
                      </div>
                      <div className="absolute bottom-2.5 right-2.5 font-mono text-[9px] text-white/70">
                        1920×1080
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-on-surface-variant transition-colors group-hover:text-primary/70">
                      <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider">Tải lên Ảnh đại diện</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save / Discard repeated at bottom */}
            <div className="flex flex-col gap-2">
              <Button type="submit" loading={isPending} className="w-full justify-center">
                <span className="material-symbols-outlined text-[16px]">save</span>Lưu thay đổi</Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDiscard}
                disabled={isPending}
                className="w-full justify-center"
              >
                <span className="material-symbols-outlined text-[16px]">undo</span>Hủy bỏ</Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
