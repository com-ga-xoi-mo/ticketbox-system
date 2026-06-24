import { Badge } from '../../../components/ui/badge';
import type { OrderStatus } from '@ticketbox/api-types';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  switch (status) {
    case 'PENDING_PAYMENT':
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20">Chờ thanh toán</Badge>;
    case 'PAID':
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Đã thanh toán</Badge>;
    case 'EXPIRED':
      return <Badge variant="secondary">Hết hạn</Badge>;
    case 'CANCELLED':
      return <Badge variant="destructive">Đã hủy</Badge>;
    case 'REFUNDED':
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">Đã hoàn tiền</Badge>;
    case 'FAILED':
      return <Badge variant="destructive">Thất bại</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
