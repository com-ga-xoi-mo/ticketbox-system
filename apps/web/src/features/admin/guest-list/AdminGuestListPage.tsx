import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import type { GuestListBatchStatus, PublicGuestListBatch } from '@ticketbox/api-types';
import { useNavigate, useParams } from 'react-router-dom';

import { useConcert } from '../concerts/hooks';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../shared/ui/table';
import { buildGuestListUploadRequest, validateGuestListFile } from './file-helpers';
import { isGuestListReportable, useGuestListBatches, useUploadGuestList } from './hooks';
import { GuestListReportPanel } from './GuestListReportPanel';

const STATUS_COPY: Record<GuestListBatchStatus, string> = {
  PENDING: 'Đang chờ',
  PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn tất',
  COMPLETED_WITH_ERRORS: 'Hoàn tất có lỗi',
  FAILED: 'Thất bại',
};

const STATUS_VARIANT: Record<
  GuestListBatchStatus,
  'muted' | 'default' | 'success' | 'warning' | 'danger'
> = {
  PENDING: 'muted',
  PROCESSING: 'default',
  COMPLETED: 'success',
  COMPLETED_WITH_ERRORS: 'warning',
  FAILED: 'danger',
};

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

function formatTimestamp(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : '—';
}

export function AdminGuestListPage() {
  const { id: concertId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const concert = useConcert(concertId);
  const batchesQuery = useGuestListBatches(concertId);
  const upload = useUploadGuestList(concertId);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedReportBatchId, setSelectedReportBatchId] = useState<string | null>(null);

  const batches = useMemo(
    () => [...(batchesQuery.data ?? [])].sort((a, b) => b.importSequence - a.importSequence),
    [batchesQuery.data],
  );
  const selectedReportBatch = batches.find(({ id }) => id === selectedReportBatchId);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFeedback(null);
    setFile(nextFile);
    if (!nextFile) {
      setFileError(null);
      return;
    }
    try {
      validateGuestListFile(nextFile);
      setFileError(null);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'Tệp CSV không hợp lệ.');
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setFileError('Vui lòng chọn một tệp CSV.');
      return;
    }
    try {
      const request = await buildGuestListUploadRequest(file);
      const result = await upload.mutateAsync(request);
      setFileError(null);
      setFeedback(
        result.outcome === 'CREATED'
          ? `Đã tạo batch #${result.batch.importSequence} để xử lý.`
          : `Tệp đã được gửi trước đó; đang dùng batch #${result.batch.importSequence}.`,
      );
    } catch (error) {
      setFeedback(null);
      setFileError(error instanceof Error ? error.message : 'Không thể upload Guest List.');
    }
  }

  return (
    <main className="flex h-full flex-col gap-5 overflow-y-auto p-4 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/concerts')}
          >
            ← Quay lại danh sách concert
          </Button>
          <h1 className="mt-2 font-display text-2xl font-bold text-on-surface">
            Guest List · {concert.data?.title ?? 'Concert'}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Upload CSV VIP, theo dõi batch và kiểm tra lỗi từng dòng.
          </p>
        </div>
        <a
          href="/templates/guest-list-template.csv"
          download
          className="inline-flex h-10 items-center rounded-lg border border-white/10 px-4 text-sm font-semibold text-on-surface hover:bg-white/5"
        >
          Tải CSV template
        </a>
      </header>

      {concert.isLoading && <p role="status">Đang tải thông tin concert…</p>}
      {concert.isError && (
        <p role="alert">Không thể tải thông tin concert: {concert.error.message}</p>
      )}

      <section className="glass-panel rounded-xl p-5">
        <h2 className="font-display text-lg font-bold text-on-surface">Upload Guest List</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Chấp nhận .csv không rỗng, tối đa 5 MiB. Worker sẽ xử lý tự động sau khi upload.
        </p>
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-sm text-on-surface-variant">
            Tệp CSV
            <input
              aria-label="Tệp Guest List CSV"
              type="file"
              accept=".csv,text/csv,application/csv,application/vnd.ms-excel"
              onChange={selectFile}
              className="rounded-lg border border-white/10 p-2 text-on-surface"
            />
          </label>
          <Button type="submit" loading={upload.isPending} disabled={!file || Boolean(fileError)}>
            Upload CSV
          </Button>
        </form>
        {fileError && (
          <p role="alert" className="mt-3 text-sm text-error">
            {fileError}
          </p>
        )}
        {feedback && (
          <p role="status" className="mt-3 text-sm text-tertiary">
            {feedback}
          </p>
        )}
      </section>

      <section className="glass-panel rounded-xl p-5">
        <div className="mb-4">
          <h2 className="font-display text-lg font-bold text-on-surface">Lịch sử import</h2>
          <p className="text-sm text-on-surface-variant">Batch mới nhất được hiển thị trước.</p>
        </div>
        {batchesQuery.isLoading && <p role="status">Đang tải batch…</p>}
        {batchesQuery.isError && (
          <div role="alert">
            Không thể tải lịch sử: {batchesQuery.error.message}{' '}
            <Button type="button" variant="ghost" size="xs" onClick={() => batchesQuery.refetch()}>
              Thử lại
            </Button>
          </div>
        )}
        {!batchesQuery.isLoading && !batchesQuery.isError && batches.length === 0 && (
          <p className="rounded-lg border border-dashed border-white/10 p-8 text-center text-on-surface-variant">
            Chưa có batch Guest List nào cho concert này.
          </p>
        )}
        {batches.length > 0 && (
          <Table
            data-testid="guest-list-history"
            className="min-w-[1480px] table-fixed"
            containerClassName="rounded-lg border border-white/10"
          >
            <TableHeader>
              <TableRow>
                <TableHead className="w-[340px]">Batch / nguồn</TableHead>
                <TableHead className="w-[140px]">Trạng thái</TableHead>
                <TableHead className="w-[100px]">Lần xử lý</TableHead>
                <TableHead className="w-[320px]">Counters</TableHead>
                <TableHead className="w-[250px]">Thời gian</TableHead>
                <TableHead className="w-[210px]">Lỗi batch</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <BatchRow
                  key={batch.id}
                  batch={batch}
                  onOpenReport={() => setSelectedReportBatchId(batch.id)}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {selectedReportBatch &&
        selectedReportBatch.reportAvailable &&
        isGuestListReportable(selectedReportBatch.status) && (
          <GuestListReportPanel
            concertId={concertId}
            batch={selectedReportBatch}
            onClose={() => setSelectedReportBatchId(null)}
          />
        )}
    </main>
  );
}

function BatchRow({
  batch,
  onOpenReport,
}: {
  batch: PublicGuestListBatch;
  onOpenReport: () => void;
}) {
  const counters = [
    ['Tổng', batch.totalRows],
    ['Hợp lệ', batch.validRows],
    ['Import', batch.importedRows],
    ['Cập nhật', batch.updatedRows],
    ['Hủy', batch.cancelledRows],
    ['Sai', batch.invalidRows],
    ['Trùng', batch.duplicateRows],
    ['Xung đột', batch.conflictRows],
  ];
  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <div className="break-words font-semibold text-on-surface">
          #{batch.importSequence} · {batch.sourceName}
        </div>
        <div className="break-all font-mono text-[11px] leading-4 text-on-surface-variant">
          {batch.checksum ?? 'Không có checksum'}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[batch.status]}>{STATUS_COPY[batch.status]}</Badge>
      </TableCell>
      <TableCell>{batch.processingAttempt}</TableCell>
      <TableCell className="whitespace-normal">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {counters.map(([label, value]) => (
            <span key={label} className="whitespace-nowrap">
              {label}: <strong>{value}</strong>
            </span>
          ))}
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs leading-5">
        <div>Tạo: {formatTimestamp(batch.createdAt)}</div>
        <div>Bắt đầu: {formatTimestamp(batch.startedAt)}</div>
        <div>Kết thúc: {formatTimestamp(batch.completedAt)}</div>
      </TableCell>
      <TableCell className="max-w-[260px] whitespace-normal text-xs">
        {batch.failureCode || batch.failureMessage ? (
          <>
            <strong>{batch.failureCode ?? 'FAILED'}</strong>:{' '}
            {batch.failureMessage ?? 'Không có mô tả'}
          </>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell>
        {batch.reportAvailable && isGuestListReportable(batch.status) && (
          <Button type="button" variant="outline" size="sm" onClick={onOpenReport}>
            Xem report
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
