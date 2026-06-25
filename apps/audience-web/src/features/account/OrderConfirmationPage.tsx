import { Link, useParams } from 'react-router-dom';
import { AlertCircle, Calendar, ChevronLeft, FileText, Printer } from 'lucide-react';
import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import { useOrderConfirmation } from '../../shared/api/downloads';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { formatDateTime, formatVnd } from './supportLabels';

export function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const confirmation = useOrderConfirmation(id);

  return (
    <AudienceProtectedRoute>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Button variant="ghost" asChild className="-ml-4">
            <Link to={`/account/orders/${id}`}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Quay lại đơn hàng
            </Link>
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            In hoặc lưu PDF
          </Button>
        </div>

        {confirmation.isLoading ? (
          <Skeleton className="h-[640px] w-full" />
        ) : confirmation.isError || !confirmation.data ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Không thể tải xác nhận mua</AlertTitle>
            <AlertDescription>Đơn hàng không khả dụng hoặc không thuộc tài khoản của bạn.</AlertDescription>
          </Alert>
        ) : (
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileText className="h-6 w-6 text-primary" />
                Xác nhận mua vé
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Đây là xác nhận mua vé, không phải hóa đơn tài chính hoặc hóa đơn thuế.
              </p>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h2 className="font-semibold">{confirmation.data.concert.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{confirmation.data.concert.venueName}</p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDateTime(confirmation.data.concert.startsAt)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-4 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <span className="text-muted-foreground">Mã đơn</span>
                    <span className="font-semibold text-right">{confirmation.data.order.orderNumber}</span>
                    <span className="text-muted-foreground">Trạng thái</span>
                    <span className="font-semibold text-right">{confirmation.data.order.status}</span>
                    <span className="text-muted-foreground">Thanh toán</span>
                    <span className="font-semibold text-right">{formatDateTime(confirmation.data.order.paidAt)}</span>
                    <span className="text-muted-foreground">Cổng</span>
                    <span className="font-semibold text-right">{confirmation.data.payment.provider ?? 'Đang cập nhật'}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <div className="grid grid-cols-[1fr_80px_120px] bg-muted/50 px-4 py-3 text-sm font-semibold">
                  <span>Hạng vé</span>
                  <span className="text-right">SL</span>
                  <span className="text-right">Thành tiền</span>
                </div>
                {confirmation.data.lineItems.map((item) => (
                  <div key={item.ticketTypeId} className="grid grid-cols-[1fr_80px_120px] border-t px-4 py-3 text-sm">
                    <span>{item.ticketTypeName ?? item.ticketTypeId}</span>
                    <span className="text-right">{item.quantity}</span>
                    <span className="text-right font-medium">{formatVnd(item.totalPriceVnd)}</span>
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_160px] border-t bg-muted/30 px-4 py-4 font-bold">
                  <span>Tổng cộng</span>
                  <span className="text-right text-primary">{formatVnd(confirmation.data.order.totalAmountVnd)}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Tạo lúc {formatDateTime(confirmation.data.generatedAt)}. Vui lòng giữ xác nhận này cùng vé điện tử trong tài khoản TicketBox.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AudienceProtectedRoute>
  );
}
