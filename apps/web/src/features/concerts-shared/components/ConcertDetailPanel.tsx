import React, { useState } from 'react';

import type { Concert } from '../types';
import { resolveConcertPosterUrl } from '../concert-image';
import { mapStatus } from '../status';
import { eventTypeLabel } from '../event-type';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog';
import { cn } from '../../../shared/ui/cn';

interface ConcertDetailPanelProps {
  concert: Concert;
  onClose?: () => void;
  onEdit?: () => void;
  onPublish?: () => void;
  onCancel?: () => void;
  isPublishing?: boolean;
  isCancelling?: boolean;
  publishError?: string | null;
  cancelError?: string | null;
}

export function ConcertDetailPanel({
  concert,
  onClose,
  onEdit,
  onPublish,
  onCancel,
  isPublishing,
  isCancelling,
  publishError,
  cancelError,
}: ConcertDetailPanelProps) {
  const { label, variant, dotClass } = mapStatus(concert.status);
  
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const handlePublish = async () => {
    setIsPublishDialogOpen(true);
  };

  const handleCancel = async () => {
    setIsCancelDialogOpen(true);
  };

  const formatJustDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('vi-VN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  const formatJustTime = (dateStr: string) => {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(dateStr));
  };

  const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return 'Không rõ';
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Vừa xong';
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  };
  const isDraft = concert.status === 'DRAFT';
  const isEnded = concert.status === 'ENDED';
  const isCancelled = concert.status === 'CANCELLED';
  const canModify = !isEnded && !isCancelled;
  const canEditDetails = canModify;

  const posterUrl = resolveConcertPosterUrl(concert);
  const typeLabel = eventTypeLabel(concert.eventType);
  const orderedArtists = concert.artists
    ? [...concert.artists].sort((a, b) => a.displayOrder - b.displayOrder)
    : [];

  return (
    <div className="glass-panel flex h-full w-full flex-col overflow-hidden rounded-xl">
      <div className="flex-1 overflow-y-auto relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-full bg-surface/60 backdrop-blur-md border border-white/10 text-on-surface hover:bg-surface/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close details"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              close
            </span>
          </button>
        )}

        {/* Hero — cinematic gradient cover */}
        <div className="relative min-h-[240px] w-full bg-gradient-to-br from-primary/20 via-surface-container to-tertiary/10">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={concert.title}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/20">
                music_note
              </span>
            </div>
          )}
          {/* Deeper overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/60 to-transparent" />

          {/* Status + title anchored at bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 pt-10">
            <div className="mb-2.5 flex items-center gap-2">
              <Badge variant={variant} className="shadow-sm border-white/10 backdrop-blur-md">
                {dotClass && <span className={`size-1.5 rounded-full ${dotClass}`} />}
                {label}
              </Badge>
              {typeLabel && (
                <span className="rounded border border-white/15 bg-black/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/80 backdrop-blur-md">
                  {typeLabel}
                </span>
              )}
            </div>
            <h4 className="break-words font-display text-xl font-bold leading-normal text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
              {concert.title}
            </h4>
            <p className="mt-1 break-words text-sm text-white/70">
              {orderedArtists.length > 0
                ? orderedArtists.map((a) => a.displayName).join(', ')
                : concert.artistName}
            </p>
          </div>
        </div>

        {/* Thin accent rule */}
        <div className="h-px w-full bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />

        {/* Info grid */}
        <div className="flex flex-col gap-8 p-6 pt-5">
          {/* EVENT INFO */}
          <div className="flex flex-col gap-4">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
              Thông tin sự kiện
            </h5>
            
            <div className="flex flex-col gap-4">
              {/* Location */}
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-0.5 text-[20px] text-on-surface-variant">
                  location_on
                </span>
                <div>
                  <div className="text-sm font-medium text-on-surface">
                    {concert.venueName || 'Chưa có địa điểm'}
                  </div>
                  <div className="mt-0.5 text-xs text-on-surface-variant">
                    {concert.city || 'Chưa có thành phố'}
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-0.5 text-[20px] text-on-surface-variant">
                  calendar_today
                </span>
                <div>
                  <div className="text-sm font-medium text-on-surface">
                    {formatJustDate(concert.startsAt)}
                  </div>
                  <div className="mt-0.5 text-xs text-on-surface-variant">
                    {formatJustTime(concert.startsAt)}
                  </div>
                </div>
              </div>

              {/* Artists */}
              {orderedArtists.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-0.5 text-[20px] text-on-surface-variant">
                    person
                  </span>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    {orderedArtists.map((artist, index) => (
                      <div key={artist.id} className="flex items-center gap-2 text-sm">
                        <span className="truncate font-medium text-on-surface">
                          {artist.displayName}
                        </span>
                        {index === 0 && (
                          <span className="shrink-0 rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                            Chính
                          </span>
                        )}
                        {artist.status === 'INACTIVE' && (
                          <span className="shrink-0 rounded bg-error/20 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-error">
                            Không hoạt động
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* INVENTORY SUMMARY */}
          <div className="flex flex-col gap-3">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
              Tóm tắt kho vé
            </h5>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-lg bg-surface-container-high/50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
                  Đã cập nhật
                </div>
                <div className="text-sm font-semibold text-on-surface">
                  {getRelativeTime(concert.updatedAt)}
                </div>
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-surface-container-high/50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
                  Loại vé
                </div>
                <div className="text-sm font-semibold text-on-surface">
                  {concert.ticketTypesCount || 0} Loại
                </div>
                <div className="text-[10px] text-on-surface-variant">
                  {concert.ticketTypesCount ? 'Đã cấu hình' : 'Chưa có'}
                </div>
              </div>
            </div>
          </div>

          {/* SETUP PROGRESS */}
          <div className="flex flex-col gap-3">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
              Tiến trình thiết lập
            </h5>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">Sơ đồ ghế</span>
                {concert.seatingMapConfigured ? (
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span className="text-xs font-medium">Đã cấu hình</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-on-surface-variant/50">
                    <span className="material-symbols-outlined text-[16px]">pending</span>
                    <span className="text-xs font-medium">Đang chờ</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">Khu vực ghế</span>
                {concert.seatingZonesCount ? (
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span className="text-xs font-medium">{concert.seatingZonesCount} Khu vực sẵn sàng</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-on-surface-variant/50">
                    <span className="material-symbols-outlined text-[16px]">pending</span>
                    <span className="text-xs font-medium">Đang chờ</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">Ánh xạ khu vực</span>
                {concert.ticketTypesCount && concert.seatingZonesCount ? (
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span className="text-xs font-medium">Hoàn tất</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-on-surface-variant/50">
                    <span className="material-symbols-outlined text-[16px]">pending</span>
                    <span className="text-xs font-medium">Đang chờ</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">Nhân viên check-in</span>
                <span className="text-xs font-medium text-on-surface-variant">
                  {concert.checkinStaffCount || 0} người được gán
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col gap-2.5 border-t border-white/5 bg-surface-container-highest/10 p-5">
        {canEditDetails && (
          <button
            onClick={onEdit}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface-container-low text-sm font-semibold text-on-surface transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">
              edit
            </span>
            Chỉnh sửa chi tiết
          </button>
        )}

        <div className="flex gap-2.5">
          {isDraft && (
            <Button
              onClick={handlePublish}
              disabled={isPublishing || isCancelling}
              className="flex-1"
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                publish
              </span>
              {isPublishing ? 'Đang xuất bản…' : 'Xuất bản sự kiện'}
            </Button>
          )}

          {canModify && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isPublishing || isCancelling}
              className="flex-1 bg-surface-container-low border border-error/20 text-error hover:bg-error/10 hover:border-error/30"
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                cancel
              </span>
              {isCancelling ? 'Đang hủy…' : 'Hủy sự kiện'}
            </Button>
          )}
        </div>

        {(publishError || cancelError) && (
          <p className="mt-1 text-center text-xs font-semibold text-error" aria-live="polite">
            {publishError || cancelError}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={isPublishDialogOpen}
        onOpenChange={setIsPublishDialogOpen}
        title="Xác nhận xuất bản sự kiện"
        description={`Bạn có chắc chắn muốn xuất bản sự kiện "${concert.title}" không? Sau khi xuất bản, khán giả sẽ có thể nhìn thấy sự kiện này.`}
        confirmText="Xuất bản"
        cancelText="Hủy"
        onConfirm={() => onPublish?.()}
      />

      <ConfirmDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        title="Xác nhận hủy sự kiện"
        description={`Bạn có chắc chắn muốn hủy sự kiện "${concert.title}" không? Hành động này không thể hoàn tác.`}
        confirmText="Xác nhận hủy"
        cancelText="Quay lại"
        confirmVariant="destructive"
        onConfirm={() => onCancel?.()}
      />
    </div>
  );
}
