import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from 'antd';
import { CalendarDays, ChevronRight, Ticket } from 'lucide-react';
import { useMyOrders } from '../../shared/api/orders';
import { useRequireAuth } from '../../shared/hooks/useRequireAuth';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { PageError } from '../../shared/ui/PageStates';

export function MyOrdersPage() {
  const { isAuthenticated, redirectToLogin } = useRequireAuth();
  
  useEffect(() => {
    if (!isAuthenticated) {
      redirectToLogin();
    }
  }, [isAuthenticated, redirectToLogin]);

  const { data: orders, isLoading, isError } = useMyOrders();

  if (!isAuthenticated) {
    return null;
  }

  if (isError) {
    return <PageError message="Không thể tải danh sách đơn hàng." />;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20">Đã thanh toán</Badge>;
      case 'PENDING_PAYMENT': return <Badge className="bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 border-orange-500/20">Chờ thanh toán</Badge>;
      case 'FAILED': return <Badge variant="destructive">Thất bại</Badge>;
      case 'EXPIRED': return <Badge variant="secondary">Đã hết hạn</Badge>;
      case 'CANCELLED': return <Badge variant="secondary">Đã hủy</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (iso: string) => new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(iso));

  const formatPrice = (vnd: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(vnd);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black">Đơn hàng của tôi</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-6">
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          ))}
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(order => (
            <Link key={order.id} to={`/orders/${order.id}`} className="block group">
              <Card className="transition-shadow hover:shadow-md border-muted group-hover:border-primary/30">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{order.orderNumber}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <CalendarDays className="mr-1.5 size-4" />
                        {formatDate(order.createdAt)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">{order.items.reduce((acc, i) => acc + i.quantity, 0)} vé</p>
                        <p className="font-bold text-lg">{formatPrice(order.totalAmountVnd)}</p>
                      </div>
                      <div className="rounded-full p-2 bg-muted/50 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <ChevronRight className="size-5" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed bg-muted/10">
          <CardContent className="py-20 text-center">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Ticket className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">Bạn chưa có đơn hàng nào</h3>
            <p className="text-muted-foreground mb-8">Hãy bắt đầu hành trình âm nhạc của bạn cùng TicketBox.</p>
            <Button className="rounded-full px-8" asChild>
              <Link to="/events">Khám phá sự kiện</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
