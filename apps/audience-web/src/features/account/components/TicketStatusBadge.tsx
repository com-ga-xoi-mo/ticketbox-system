import { Badge } from '../../../components/ui/badge';
import type { TicketStatus } from '@ticketbox/api-types';

interface TicketStatusBadgeProps {
  status: TicketStatus;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  switch (status) {
    case 'ISSUED':
      return <Badge variant="default">Hợp lệ</Badge>;
    case 'CHECKED_IN':
      return <Badge variant="secondary">Đã check-in</Badge>;
    case 'VOIDED':
      return <Badge variant="destructive">Đã hủy</Badge>;
    case 'REFUNDED':
      return <Badge variant="secondary">Đã hoàn tiền</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

