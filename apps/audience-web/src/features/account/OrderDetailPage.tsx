import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useOrderDetail, useCancelOrder, useInitiatePayment } from '../../shared/api/orders';
import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { AlertCircle, Calendar, Download, LifeBuoy, Mail, ReceiptText, ChevronLeft, CreditCard, RefreshCw } from 'lucide-react';
import { OrderStatusBadge } from './components/OrderStatusBadge';
import { ReservationCountdown } from './components/ReservationCountdown';
import { generateIdempotencyKey } from '../../shared/lib/idempotency';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import type { PaymentProvider } from '@ticketbox/api-types';
import { useRefundEligibility } from '../../shared/api/support';
import { useResendOrderTickets } from '../../shared/api/downloads';
import { parseSupportError } from '../../shared/api/support';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError, refetch } = useOrderDetail(id as string);
  const cancelMutation = useCancelOrder();
  const paymentMutation = useInitiatePayment();
  const refundEligibility = useRefundEligibility({ orderId: id });
  const resendOrder = useResendOrderTickets();
  
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('VNPAY');
  const [reservationExpired, setReservationExpired] = useState(false);

  const handleCancelOrder = () => {
    if (!id) return;
    cancelMutation.mutate(id, {
      onSuccess: () => {
        setIsCancelDialogOpen(false);
      }
    });
  };

  const handleContinuePayment = () => {
    if (!id) return;
    paymentMutation.mutate({
      id,
      dto: { provider: paymentProvider, idempotencyKey: generateIdempotencyKey() }
    }, {
      onSuccess: (data) => {
        if (data && data.redirectUrl) {
          window.location.href = data.redirectUrl;
        }
      }
    });
  };

  const handleResendTickets = () => {
    if (id) resendOrder.mutate(id);
  };

  return (
    <AudienceProtectedRoute>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-6 -ml-4 text-muted-foreground">
          <Link to="/account/orders">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Quay lại danh sách
          </Link>
        </Button>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : isError || !order ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>
              Không thể tải chi tiết đơn hàng.
              <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-4">
                Đơn hàng {order.orderNumber}
                <OrderStatusBadge status={order.status} />
              </h1>
              <div className="mt-2 flex items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {order.status === 'PENDING_PAYMENT' && order.reservationExpiresAt && !reservationExpired && (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertTitle className="text-yellow-500">Thanh toán đang chờ</AlertTitle>
                <AlertDescription className="text-yellow-600/90">
                  Vui lòng hoàn tất thanh toán trong <ReservationCountdown 
                    reservationExpiresAt={order.reservationExpiresAt} 
                    onExpired={() => setReservationExpired(true)} 
                  /> để giữ vé.
                </AlertDescription>
              </Alert>
            )}

            {order.status === 'PENDING_PAYMENT' && reservationExpired && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Hết thời gian giữ vé</AlertTitle>
                <AlertDescription>
                  Đơn hàng này đã quá hạn thanh toán. Vui lòng đặt lại đơn hàng mới.
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ReceiptText className="h-5 w-5" />
                  Chi tiết thanh toán
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {order.items.map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium">Vé Loại: {item.ticketTypeId}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} x {item.unitPriceVnd.toLocaleString('vi-VN')} đ
                        </p>
                      </div>
                      <p className="font-semibold">{item.totalPriceVnd.toLocaleString('vi-VN')} đ</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between border-t pt-4 text-lg font-bold">
                  <p>Tổng cộng</p>
                  <p className="text-primary">{order.totalAmountVnd.toLocaleString('vi-VN')} đ</p>
                </div>

                {order.paidAt && (
                  <p className="text-sm text-muted-foreground text-right">
                    Thanh toán lúc: {new Date(order.paidAt).toLocaleString('vi-VN')}
                  </p>
                )}
                {order.cancelledAt && (
                  <p className="text-sm text-muted-foreground text-right">
                    Hủy lúc: {new Date(order.cancelledAt).toLocaleString('vi-VN')}
                  </p>
                )}
              </CardContent>
              
              {order.status === 'PENDING_PAYMENT' && !reservationExpired && (
                <CardFooter className="flex flex-col gap-4 border-t pt-6 sm:flex-row sm:justify-end">
                  <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={cancelMutation.isPending}>
                        Hủy đơn hàng
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Xác nhận hủy đơn hàng</DialogTitle>
                        <DialogDescription>
                          Bạn có chắc chắn muốn hủy đơn hàng này không? Vé đã chọn sẽ được nhả ra cho người khác.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>Không, quay lại</Button>
                        <Button variant="destructive" onClick={handleCancelOrder} disabled={cancelMutation.isPending}>
                          {cancelMutation.isPending ? 'Đang hủy...' : 'Có, hủy đơn hàng'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Select value={paymentProvider} onValueChange={(value) => setPaymentProvider(value as PaymentProvider)}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Phương thức" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VNPAY">VNPAY</SelectItem>
                        <SelectItem value="MOMO">Ví MoMo</SelectItem>
                        <SelectItem value="SIMULATOR">Simulator (Test)</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      onClick={handleContinuePayment} 
                      disabled={paymentMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      {paymentMutation.isPending ? 'Đang xử lý...' : 'Thanh toán ngay'}
                    </Button>
                  </div>
                  
                  {paymentMutation.isError && (
                    <p className="text-sm text-destructive w-full text-right mt-2">
                      Có lỗi xảy ra khi khởi tạo thanh toán. Vui lòng thử lại.
                    </p>
                  )}
                </CardFooter>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LifeBuoy className="h-5 w-5" />
                  Hỗ trợ đơn hàng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="outline" asChild>
                    <Link to={`/account/support?orderId=${order.id}`}>
                      <LifeBuoy className="mr-2 h-4 w-4" />
                      Liên hệ hỗ trợ
                    </Link>
                  </Button>
                  {order.status === 'PAID' && (
                    <Button variant="outline" asChild>
                      <Link to={`/account/orders/${order.id}/confirmation`}>
                        <Download className="mr-2 h-4 w-4" />
                        Tải xác nhận mua
                      </Link>
                    </Button>
                  )}
                  {order.status === 'PAID' && (
                    <Button variant="outline" onClick={handleResendTickets} disabled={resendOrder.isPending}>
                      <Mail className="mr-2 h-4 w-4" />
                      {resendOrder.isPending ? 'Đang gửi...' : 'Gửi lại email vé'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    asChild
                    disabled={!refundEligibility.data?.eligible}
                  >
                    <Link to={`/account/support?orderId=${order.id}&tab=refund`}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Yêu cầu hoàn tiền
                    </Link>
                  </Button>
                </div>
                {refundEligibility.data && (
                  <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                    {refundEligibility.data.eligible
                      ? refundEligibility.data.message
                      : `Hoàn tiền chưa khả dụng: ${refundEligibility.data.message}`}
                  </p>
                )}
                {resendOrder.isSuccess && (
                  <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700">
                    {resendOrder.data.message}
                  </p>
                )}
                {resendOrder.isError && (
                  <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {parseSupportError(resendOrder.error)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AudienceProtectedRoute>
  );
}
