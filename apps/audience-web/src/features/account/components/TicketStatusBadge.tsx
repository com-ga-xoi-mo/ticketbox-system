import { Badge } from '../../../components/ui/badge';

interface TicketStatusBadgeProps {
  status: string; // Cast to string since TS may not have new enum value immediately
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
    case 'LISTED_FOR_RESALE':
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-600 dark:text-orange-400">
          Đang bán lại
        </Badge>
      );
    case 'TRANSFERRED':
      return (
        <Badge variant="outline" className="border-gray-500 text-gray-500 dark:text-gray-400">
          Đã chuyển nhượng
        </Badge>
      );
    case 'TRANSFER_PENDING':
      return (
        <Badge
          variant="outline"
          className="bg-amber-100 border-amber-500 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
        >
          Đang tặng
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
