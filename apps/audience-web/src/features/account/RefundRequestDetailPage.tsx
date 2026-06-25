import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import { useRefundRequest } from '../../shared/api/support';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { formatDateTime, formatVnd, refundReasonLabels, refundStatusLabels } from './supportLabels';
import { Timeline } from './SupportCenterPage';

export function RefundRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const request = useRefundRequest(id);

  return (
    <AudienceProtectedRoute>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-6 -ml-4">
          <Link to="/account/support">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Trung tâm hỗ trợ
          </Link>
        </Button>
        {request.isLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : request.isError || !request.data ? (
          <Alert variant="destructive">
            <AlertTitle>Không thể tải yêu cầu hoàn tiền</AlertTitle>
            <AlertDescription>Yêu cầu không tồn tại hoặc không thuộc tài khoản của bạn.</AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-3">
                <RefreshCw className="h-5 w-5 text-primary" />
                {refundReasonLabels[request.data.reason]}
                <Badge variant="secondary">{refundStatusLabels[request.data.status]}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertTitle>Yêu cầu xét duyệt hoàn tiền</AlertTitle>
                <AlertDescription>
                  Trạng thái này không xác nhận tiền đã được hoàn qua cổng thanh toán.
                </AlertDescription>
              </Alert>
              <div className="grid gap-4 rounded-lg bg-muted/30 p-4 text-sm sm:grid-cols-2">
                <div><span className="text-muted-foreground">Giá trị yêu cầu</span><p className="font-medium">{formatVnd(request.data.requestedAmountVnd)}</p></div>
                <div><span className="text-muted-foreground">Số vé</span><p className="font-medium">{request.data.requestedTicketCount ?? 'Đang cập nhật'}</p></div>
                <div><span className="text-muted-foreground">Đơn hàng</span><p className="font-medium">{request.data.orderId}</p></div>
                <div><span className="text-muted-foreground">Vé</span><p className="font-medium">{request.data.ticketId ?? 'Toàn bộ đơn hàng'}</p></div>
                <div><span className="text-muted-foreground">Cập nhật</span><p className="font-medium">{formatDateTime(request.data.updatedAt)}</p></div>
              </div>
              {request.data.message && (
                <div>
                  <h2 className="mb-2 font-semibold">Ghi chú</h2>
                  <p className="whitespace-pre-wrap rounded-lg border p-4 text-sm leading-6">{request.data.message}</p>
                </div>
              )}
              <div>
                <h2 className="mb-3 font-semibold">Dòng thời gian</h2>
                <Timeline
                  items={request.data.statusHistory.map((item) => ({
                    ...item,
                    status: refundStatusLabels[item.status],
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AudienceProtectedRoute>
  );
}
