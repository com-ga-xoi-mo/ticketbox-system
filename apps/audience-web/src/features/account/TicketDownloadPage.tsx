import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { AlertCircle, Calendar, ChevronLeft, Download, MapPin, Printer } from 'lucide-react';
import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import { useTicketDownload } from '../../shared/api/downloads';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { formatDateTime } from './supportLabels';

export function TicketDownloadPage() {
  const { id } = useParams<{ id: string }>();
  const ticket = useTicketDownload(id);

  return (
    <AudienceProtectedRoute>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Button variant="ghost" asChild className="-ml-4">
            <Link to={`/account/tickets/${id}`}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Quay lại vé
            </Link>
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            In hoặc lưu PDF
          </Button>
        </div>

        {ticket.isLoading ? (
          <Skeleton className="h-[680px] w-full" />
        ) : ticket.isError || !ticket.data ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Không thể tải vé</AlertTitle>
            <AlertDescription>Vé không khả dụng hoặc không thuộc tài khoản của bạn.</AlertDescription>
          </Alert>
        ) : (
          <Card className="print:border-0 print:shadow-none">
            <CardContent className="p-0">
              <div className="grid gap-0 md:grid-cols-[320px_1fr]">
                <div className="flex flex-col items-center justify-center bg-white p-8 text-zinc-950">
                  {ticket.data.ticket.qrPayload ? (
                    <QRCodeSVG value={ticket.data.ticket.qrPayload} size={248} level="H" />
                  ) : (
                    <div className="flex size-[248px] flex-col items-center justify-center rounded-lg border-2 border-dashed text-center text-sm text-zinc-500">
                      <AlertCircle className="mb-2 h-6 w-6" />
                      QR không khả dụng
                    </div>
                  )}
                  <p className="mt-4 text-center text-xs font-medium text-zinc-500">Mã QR được tạo tạm thời cho bản tải này</p>
                </div>
                <div className="space-y-6 p-8">
                  <div>
                    <p className="mb-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <Download className="mr-1 h-3 w-3" />
                      Ticket
                    </p>
                    <h1 className="text-2xl font-black">{ticket.data.concert.title}</h1>
                    <p className="mt-1 font-mono text-sm text-muted-foreground">{ticket.data.ticket.ticketNumber}</p>
                  </div>
                  <div className="grid gap-4 text-sm">
                    <div className="flex gap-3">
                      <Calendar className="mt-0.5 h-5 w-5 text-primary" />
                      <div><p className="font-medium">Thời gian</p><p className="text-muted-foreground">{formatDateTime(ticket.data.concert.startsAt)}</p></div>
                    </div>
                    <div className="flex gap-3">
                      <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                      <div><p className="font-medium">Địa điểm</p><p className="text-muted-foreground">{ticket.data.concert.venueName}</p></div>
                    </div>
                  </div>
                  <div className="grid gap-3 rounded-lg bg-muted/40 p-4 text-sm sm:grid-cols-2">
                    <div><span className="text-muted-foreground">Loại vé</span><p className="font-semibold">{ticket.data.ticket.ticketTypeName}</p></div>
                    <div><span className="text-muted-foreground">Khu vực</span><p className="font-semibold">{ticket.data.ticket.ticketTypeCode}</p></div>
                    <div><span className="text-muted-foreground">Trạng thái</span><p className="font-semibold">{ticket.data.ticket.status}</p></div>
                    <div><span className="text-muted-foreground">Đơn hàng</span><p className="font-semibold">{ticket.data.order.orderNumber}</p></div>
                  </div>
                  <p className="text-xs text-muted-foreground">Tạo lúc {formatDateTime(ticket.data.generatedAt)}. Vé được xác thực tại cổng check-in.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AudienceProtectedRoute>
  );
}
