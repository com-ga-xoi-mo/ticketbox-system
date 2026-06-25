import { Badge } from '../../../components/ui/badge';
import type { OrderStatus } from '@ticketbox/api-types';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  switch (status) {
    case 'PENDING_PAYMENT':
      return <Badge variant="outline">Chờ thanh toán</Badge>;
    case 'PAID':
      return <Badge variant="default">Đã thanh toán</Badge>;
    case 'EXPIRED':
      return <Badge variant="secondary">Hết hạn</Badge>;
    case 'CANCELLED':
      return <Badge variant="destructive">Đã hủy</Badge>;
    case 'REFUNDED':
      return <Badge variant="secondary">Đã hoàn tiền</Badge>;
    case 'FAILED':
      return <Badge variant="destructive">Thất bại</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

