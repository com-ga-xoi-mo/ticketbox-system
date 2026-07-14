import { useRef, useState } from 'react';

import type { ArtistBioManagementRole } from './api';
import { artistBioErrorMessage } from './errors';
import { useArtistBio, useArtistBioMutations, useArtistBioScope } from './hooks';
import { Badge } from '../../shared/ui/badge';
import { Button } from '../../shared/ui/button';

interface ArtistBioPanelProps {
  concertId: string;
  role: ArtistBioManagementRole;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function ArtistBioPanel({ concertId, role }: ArtistBioPanelProps) {
  const scope = useArtistBioScope(role);
  const query = useArtistBio(scope, concertId);
  const mutations = useArtistBioMutations(scope);
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const bio = query.data;
  const pending =
    mutations.upload.isPending ||
    mutations.retry.isPending ||
    mutations.publish.isPending ||
    mutations.reject.isPending;
  const mutationError =
    mutations.upload.error ??
    mutations.retry.error ??
    mutations.publish.error ??
    mutations.reject.error;
  const error =
    localError ??
    (mutationError
      ? artistBioErrorMessage(mutationError)
      : query.error
        ? artistBioErrorMessage(query.error)
        : null);

  const selectFile = () => inputRef.current?.click();
  const uploadFile = (file: File | undefined) => {
    if (!file) return;
    setLocalError(null);
    mutations.upload.mutate(
      { concertId, file },
      { onError: (reason) => setLocalError(artistBioErrorMessage(reason)) },
    );
  };

  const canRetry = Boolean(
    bio?.status === 'FAILED' &&
    bio.retryCount < bio.maxAttempts &&
    (!bio.nextRetryAt || new Date(bio.nextRetryAt).getTime() <= Date.now()),
  );

  return (
    <section
      className="flex flex-col gap-3 border-t border-white/10 pt-5"
      aria-labelledby="artist-bio-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <h5
          id="artist-bio-heading"
          className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70"
        >
          Tiểu sử nghệ sĩ (AI)
        </h5>
        {bio?.status === 'PUBLISHED' && <Badge variant="success">Đã công khai</Badge>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-label="Tải lên PDF press kit"
        onChange={(event) => {
          uploadFile(event.target.files?.[0]);
          event.currentTarget.value = '';
        }}
      />

      {error && (
        <p
          role="alert"
          className="rounded-md border border-error/20 bg-error/10 p-3 text-xs text-error"
        >
          {error}
        </p>
      )}

      {query.isLoading ? (
        <p className="text-sm text-on-surface-variant">Đang tải tiểu sử nghệ sĩ…</p>
      ) : !bio || bio.status === 'REJECTED' ? (
        <div className="rounded-lg border border-dashed border-white/20 bg-surface-container-low p-4 text-center">
          <p className="text-sm text-on-surface">Tải lên PDF press kit</p>
          <p className="mt-1 text-xs text-on-surface-variant">PDF tối đa 5 MB</p>
          <Button
            className="mt-3"
            size="sm"
            onClick={selectFile}
            loading={mutations.upload.isPending}
            disabled={pending}
          >
            {bio?.status === 'REJECTED' ? 'Tạo lại' : 'Tải lên PDF press kit'}
          </Button>
        </div>
      ) : bio.status === 'DRAFT' ? (
        <div
          className="flex items-center gap-3 rounded-lg bg-surface-container-low p-4"
          role="status"
        >
          <span className="material-symbols-outlined animate-spin text-primary" aria-hidden="true">
            progress_activity
          </span>
          <p className="text-sm text-on-surface">Đang xếp hàng tạo tiểu sử…</p>
        </div>
      ) : bio.status === 'PROCESSING' ? (
        <div
          className="flex items-center gap-3 rounded-lg bg-surface-container-low p-4"
          role="status"
        >
          <span className="material-symbols-outlined animate-spin text-primary" aria-hidden="true">
            progress_activity
          </span>
          <p className="text-sm text-on-surface">Đang tạo tiểu sử…</p>
        </div>
      ) : bio.status === 'READY_FOR_REVIEW' ? (
        <div className="flex flex-col gap-3">
          <p className="whitespace-pre-wrap rounded-lg bg-surface-container-low p-3 text-sm text-on-surface">
            {bio.generatedBio}
          </p>
          <div className="flex gap-2">
            <Button
              loading={mutations.publish.isPending}
              disabled={pending}
              onClick={() => mutations.publish.mutate({ concertId, id: bio.id })}
            >
              Duyệt & công khai
            </Button>
            <Button
              variant="destructive"
              loading={mutations.reject.isPending}
              disabled={pending}
              onClick={() => mutations.reject.mutate({ concertId, id: bio.id })}
            >
              Từ chối
            </Button>
          </div>
        </div>
      ) : bio.status === 'PUBLISHED' ? (
        <div className="flex flex-col gap-3">
          <p className="whitespace-pre-wrap rounded-lg bg-surface-container-low p-3 text-sm text-on-surface">
            {bio.publishedBio}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={selectFile}
            loading={mutations.upload.isPending}
            disabled={pending}
          >
            Tải lên PDF mới
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg bg-surface-container-low p-4">
          <p className="text-sm text-error">
            {bio.errorMessage || 'Không thể tạo tiểu sử nghệ sĩ.'}
          </p>
          <p className="text-xs text-on-surface-variant">
            Lần thử: {bio.retryCount}/{bio.maxAttempts}
            {formatDate(bio.nextRetryAt) ? ` · Thử lại sau ${formatDate(bio.nextRetryAt)}` : ''}
          </p>
          <Button
            size="sm"
            onClick={() => mutations.retry.mutate({ concertId, id: bio.id })}
            loading={mutations.retry.isPending}
            disabled={pending || !canRetry}
          >
            Thử lại
          </Button>
        </div>
      )}
    </section>
  );
}
