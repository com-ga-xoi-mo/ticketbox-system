import type { PublicGuestListBatch } from '@ticketbox/api-types';

import { Button } from '../../../shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../shared/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../shared/ui/table';
import { downloadGuestListReport } from './file-helpers';
import { useGuestListReport } from './hooks';

export function GuestListReportPanel({
  concertId,
  batch,
  onClose,
}: {
  concertId: string;
  batch: PublicGuestListBatch;
  onClose: () => void;
}) {
  const report = useGuestListReport(concertId, batch.id, batch.status);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader className="pr-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="font-display text-lg font-bold text-on-surface">
                Chi tiết báo cáo import
              </DialogTitle>
              <DialogDescription className="mt-1 text-on-surface-variant">
                {batch.sourceName}
              </DialogDescription>
              <p className="mt-1 break-all font-mono text-xs text-on-surface-variant">{batch.id}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </DialogHeader>

        {report.isLoading && <p role="status">Đang tải báo cáo…</p>}
        {report.isError && (
          <div
            role="alert"
            className="rounded-lg border border-error/20 bg-error/10 p-3 text-error"
          >
            Không thể tải báo cáo: {report.error.message}
          </div>
        )}
        {report.data && (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {Object.entries(report.data.summary).map(([label, value]) => (
                <div key={label} className="rounded-lg bg-white/5 p-3">
                  <div className="font-mono text-lg font-bold text-on-surface">{value}</div>
                  <div className="text-xs text-on-surface-variant">{label}</div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => downloadGuestListReport(report.data)}
            >
              Tải report JSON
            </Button>
            <Table className="min-w-[920px]" containerClassName="rounded-lg border border-white/10">
              <TableHeader>
                <TableRow>
                  <TableHead>Dòng</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Khách</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Điện thoại</TableHead>
                  <TableHead>External ref</TableHead>
                  <TableHead>Kết quả</TableHead>
                  <TableHead>Lý do</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.data.rows.map((row) => (
                  <TableRow key={row.rowNumber}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>{row.guestName ?? '—'}</TableCell>
                    <TableCell>{row.email ?? '—'}</TableCell>
                    <TableCell>{row.phone ?? '—'}</TableCell>
                    <TableCell>{row.externalRef ?? '—'}</TableCell>
                    <TableCell>{row.disposition}</TableCell>
                    <TableCell className="max-w-[260px] whitespace-normal">
                      {[row.reasonCode, row.reasonMessage].filter(Boolean).join(': ') || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
