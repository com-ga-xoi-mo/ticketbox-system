import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, Ticket, CalendarDays, ChevronLeft, CreditCard } from 'lucide-react';
import type { PaymentProvider } from '@ticketbox/api-types';

import { useOrderDetail, useMyTickets, useMyTicketDetail, initiatePayment, parseOrderError } from '../../shared/api/orders';
import { generateIdempotencyKey } from '../../shared/lib/idempotency';
import { useCountdown } from '../../shared/hooks/useCountdown';

import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Separator } from '../../components/ui/separator';
import { PageError, PageLoading, PageUnavailable } from '../../shared/ui/PageStates';
import { OrderPricingBreakdown } from '../checkout/components/OrderPricingBreakdown';

function TicketQRDisplay({ ticketId }: { ticketId: string }) {
  const { data: ticket, isLoading, isError } = useMyTicketDetail(ticketId);

  if (isLoading) {
    return <div className="flex h-48 items-center justify-center bg-muted/20 rounded-xl"><Loader2 className="animate-spin text-muted-foreground size-6" /></div>;
  }

  if (isError || !ticket) {
    return <div className="flex h-48 items-center justify-center bg-red-50 text-red-500 rounded-xl text-sm">Không thể tải mã QR</div>;
  }

  const qrData = (ticket as any).qrPayload ?? ticket.id;

  return (
    <div className="flex flex-col items-center justify-center p-6 border rounded-2xl bg-white shadow-sm">
      <div className="mb-4 text-center">
        <h4 className="font-bold text-lg">{ticket.ticketTypeName || 'Vé'}</h4>
        <p className="text-sm text-muted-foreground font-mono mt-1">{ticket.id.split('-')[0].toUpperCase()}</p>
      </div>
      <div className="p-4 bg-white border rounded-xl shadow-sm">
        <QRCodeSVG value={qrData} size={180} level="H" includeMargin={false} />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Vui lòng xuất trình mã QR này khi soát vé</p>
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, isError, error } = useOrderDetail(id ?? '');
  const { data: tickets } = useMyTickets();
  
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('SIMULATOR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { formatted, isExpired } = useCountdown(order?.reservationExpiresAt ?? null);

  if (isLoading) return <PageLoading />;
  
  if (isError) {
    const err = error as any;
    if (err?.response?.status === 404 || err?.status === 404 || err?.message?.includes('Not Found')) {
      return <PageUnavailable />;
    }
    return <PageError message="Không thể tải thông tin đơn hàng." />;
  }

  if (!order) return <PageUnavailable />;

  const orderTickets = tickets?.filter(t => t.orderId === order.id) || [];

  const handlePayment = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const idempotencyKey = generateIdempotencyKey();
      const returnUrl = `${window.location.origin}/orders/${order.id}/result`;
      
      const res = await initiatePayment(order.id, {
        idempotencyKey,
        provider: selectedProvider,
        returnUrl,
      });

      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
      }
    } catch (err) {
      setErrorMsg(parseOrderError(err));
      setIsSubmitting(false);
    }
  };

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
      <div className="mb-6">
        <Button variant="ghost" className="-ml-4 mb-4 text-muted-foreground" onClick={() => navigate('/orders')}>
          <ChevronLeft className="mr-2 size-4" />
          Đơn hàng của tôi
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-black">Chi tiết đơn hàng</h1>
          <div>{getStatusBadge(order.status)}</div>
        </div>
        <p className="mt-2 text-muted-foreground">Mã đơn: <span className="font-mono font-medium">{order.orderNumber}</span></p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          
          {errorMsg && (
            <Alert variant="destructive">
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {order.status === 'PAID' && (
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <Ticket className="mr-2 size-5" />
                  Vé của bạn ({orderTickets.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orderTickets.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-6 animate-spin mb-2" />
                    Đang tải vé...
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {orderTickets.map(ticket => (
                      <TicketQRDisplay key={ticket.id} ticketId={ticket.id} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {order.status === 'PENDING_PAYMENT' && (
            <Card className="border-orange-200">
              <CardHeader className="bg-orange-50/50">
                <CardTitle className="text-orange-800">Hoàn tất thanh toán</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {!isExpired ? (
                  <>
                    <div className="flex items-center justify-between p-4 bg-orange-50 text-orange-800 rounded-lg border border-orange-200">
                      <span className="font-medium">Thời gian giữ vé còn lại</span>
                      <span className="text-xl font-bold font-mono">{formatted}</span>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground">Chọn cổng thanh toán</label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {(['SIMULATOR', 'MOMO', 'VNPAY'] as PaymentProvider[]).map(provider => (
                          <div 
                            key={provider}
                            className={`border rounded-xl p-4 cursor-pointer flex flex-col items-center justify-center transition-all text-center ${selectedProvider === provider ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'}`}
                            onClick={() => setSelectedProvider(provider)}
                          >
                            <CreditCard className={`size-6 mb-2 ${selectedProvider === provider ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="font-medium text-sm">{provider === 'SIMULATOR' ? 'Giả lập' : provider}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <CalendarDays className="size-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-bold">Thời gian giữ vé đã hết</h3>
                    <p className="text-muted-foreground mt-2">Đơn hàng này không thể thanh toán được nữa.</p>
                  </div>
                )}
              </CardContent>
              {!isExpired && (
                <CardFooter className="bg-muted/20">
                  <Button 
                    className="w-full h-11 rounded-full shadow-lg shadow-primary/20" 
                    onClick={handlePayment} 
                    disabled={isSubmitting || isExpired}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 animate-spin size-4" /> : null}
                    Thanh toán {formatPrice(order.totalAmountVnd)}
                  </Button>
                </CardFooter>
              )}
            </Card>
          )}

          {(order.status === 'FAILED' || order.status === 'EXPIRED' || order.status === 'CANCELLED') && (
            <Card className="border-red-100 bg-red-50/30">
              <CardContent className="py-10 text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Ticket className="size-8 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-red-900">
                  {order.status === 'FAILED' && 'Thanh toán thất bại'}
                  {order.status === 'EXPIRED' && 'Đơn hàng đã hết hạn'}
                  {order.status === 'CANCELLED' && 'Đơn hàng đã hủy'}
                </h3>
                <p className="text-red-700/80 mt-2 max-w-sm mx-auto">
                  Bạn có thể quay lại trang sự kiện để thực hiện đặt vé mới.
                </p>
                <Button className="mt-6 rounded-full" variant="outline" asChild>
                  <Link to={`/events/${order.concertId}`}>Quay lại sự kiện</Link>
                </Button>
              </CardContent>
            </Card>
          )}

        </div>

        <div className="lg:col-span-1">
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-lg">Tóm tắt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ngày đặt:</span>
                <span className="font-medium">{formatDate(order.createdAt)}</span>
              </div>
              {order.paidAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Thanh toán lúc:</span>
                  <span className="font-medium">{formatDate(order.paidAt)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Chi tiết vé</h4>
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="truncate pr-4">{item.ticketTypeName || 'Vé'} <span className="text-muted-foreground">x{item.quantity}</span></span>
                    <span className="font-medium shrink-0">{formatPrice(item.totalPriceVnd)}</span>
                  </div>
                ))}
              </div>
              
              <OrderPricingBreakdown
                subtotalVnd={order.subtotalVnd ?? order.totalAmountVnd}
                discountAmountVnd={order.discountAmountVnd ?? 0}
                serviceFeeVnd={order.serviceFeeVnd ?? 0}
                totalAmountVnd={order.totalAmountVnd}
                promoCode={order.promoCode}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
