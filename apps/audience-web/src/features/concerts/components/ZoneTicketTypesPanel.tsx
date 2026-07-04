import type { PublicSeatingZone, PublicTicketType } from '@ticketbox/api-types';
import { Badge } from '../../../components/ui/badge';
import { getSaleWindowState, type SaleWindowState } from '../utils/ticket-type-status';

interface ZoneTicketTypesPanelProps {
  zone: PublicSeatingZone | null;
  ticketTypes: PublicTicketType[];
  className?: string;
}

function formatPrice(vnd: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(vnd);
}

function SaleStateBadge({ state }: { state: SaleWindowState }) {
  switch (state) {
    case 'sold-out':
      return <Badge variant="destructive">Hết vé</Badge>;
    case 'paused':
      return <Badge variant="secondary">Tạm dừng</Badge>;
    case 'ended':
      return <Badge variant="secondary">Đã kết thúc</Badge>;
    case 'upcoming':
      return <Badge variant="secondary">Sắp mở bán</Badge>;
    case 'on-sale':
    default:
      return (
        <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20">
          Đang mở bán
        </Badge>
      );
  }
}

export function ZoneTicketTypesPanel({ zone, ticketTypes, className }: ZoneTicketTypesPanelProps) {
  if (!zone) {
    return (
      <div className={className}>
        <p className="text-sm text-muted-foreground">
          Chọn một khu vực trên sơ đồ để xem loại vé áp dụng.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-2">
        <div
          className="size-3 shrink-0 rounded-full border border-black/10"
          style={{ backgroundColor: zone.color || '#ccc' }}
        />
        <p className="text-sm font-bold text-foreground">{zone.label}</p>
      </div>

      {ticketTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có loại vé áp dụng.</p>
      ) : (
        <ul className="space-y-2">
          {ticketTypes.map((tt) => {
            const state = getSaleWindowState(tt);
            return (
              <li
                key={tt.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-white/60 px-3 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">{tt.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Còn {tt.availableQuantity} vé
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <SaleStateBadge state={state} />
                  <span className="font-bold text-primary">{formatPrice(tt.priceVnd)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
