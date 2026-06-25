import { Link } from 'react-router-dom';
import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import { useMyOrders } from '../../shared/api/orders';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { AlertCircle, Calendar, Receipt } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { OrderStatusBadge } from './components/OrderStatusBadge';

export function MyOrdersPage() {
  const { data: orders, isLoading, isError, refetch } = useMyOrders();

  // Sort orders by createdAt descending
  const sortedOrders = orders ? [...orders].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ) : [];

  return (
    <AudienceProtectedRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Đơn hàng của tôi</h1>
            <p className="mt-2 text-muted-foreground">Quản lý lịch sử mua vé và thanh toán.</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/account">Quay lại</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>
              Không thể tải danh sách đơn hàng.
              <Button variant="outline" size="sm" className="mt-2 w-full sm:w-auto sm:ml-4" onClick={() => refetch()}>
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : sortedOrders.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
            <Receipt className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Chưa có đơn hàng nào</h3>
            <p className="mb-6 text-muted-foreground">Bạn chưa thực hiện giao dịch nào trên hệ thống.</p>
            <Button asChild>
              <Link to="/events">Khám phá sự kiện</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedOrders.map((order) => (
              <Link key={order.id} to={`/account/orders/${order.id}`} className="block">
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{order.orderNumber}</span>
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <h3 className="text-lg font-semibold line-clamp-1">Đơn hàng {order.orderNumber}</h3>
                        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-end justify-between sm:flex-col sm:items-end sm:justify-center">
                        <span className="text-lg font-bold">
                          {order.totalAmountVnd.toLocaleString('vi-VN')} đ
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)} vé
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AudienceProtectedRoute>
  );
}
