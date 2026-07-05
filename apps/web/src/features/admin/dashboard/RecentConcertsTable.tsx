import { Link } from 'react-router-dom';
import { MOCK_RECENT_CONCERTS, type ConcertStatus } from './mock-data';
import { Badge } from '../../../shared/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../shared/ui/table';

const STATUS_VARIANT: Record<ConcertStatus, 'success' | 'muted' | 'default' | 'danger'> = {
  PUBLISHED: 'success',
  DRAFT: 'muted',
  ENDED: 'default',
  CANCELLED: 'danger',
};

const STATUS_LABEL: Record<ConcertStatus, string> = {
  PUBLISHED: 'Đã xuất bản',
  DRAFT: 'Bản nháp',
  ENDED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
});

export function RecentConcertsTable() {
  return (
    <article className="glass-panel flex flex-col overflow-hidden rounded-xl">
      <div className="flex flex-col gap-4 border-b border-white/5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs text-on-surface-variant">hàng đợi gần đây</p>
          <h2 className="mt-2 font-display text-xl font-bold text-on-surface">Hoạt động sự kiện</h2>
        </div>
        <Link
          to="/admin/concerts"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Xem Sự kiện
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-container-high/20">
              {[
                { label: 'Sự kiện', cls: 'pl-6' },
                { label: 'Ban tổ chức' },
                { label: 'Ngày' },
                { label: 'Địa điểm' },
                { label: 'Trạng thái' },
                { label: 'Thao tác', cls: 'pr-6 text-right' },
              ].map(({ label, cls = '' }) => (
                <TableHead key={label} className={cls}>
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_RECENT_CONCERTS.map((concert) => {
              const faded = concert.status === 'CANCELLED';
              return (
                <TableRow
                  key={concert.id}
                  className="transition-colors duration-200 hover:bg-primary/5"
                >
                  <TableCell className="pl-6">
                    <div className="min-w-48">
                      <p
                        className={`truncate font-semibold text-on-surface ${faded ? 'opacity-50' : ''}`}
                      >
                        {concert.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-on-surface-variant">
                        {concert.city}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-on-surface-variant">
                    <span className="block max-w-44 truncate">{concert.organizer}</span>
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums text-on-surface-variant">
                    {dateFormatter.format(new Date(concert.date))}
                  </TableCell>
                  <TableCell className="text-sm text-on-surface-variant">
                    <span className="block max-w-44 truncate">{concert.venue}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[concert.status]}>
                      {STATUS_LABEL[concert.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Link
                      to={`/admin/concerts/${concert.id}/edit`}
                      className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Chỉnh sửa
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </article>
  );
}
