import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useTicketDetail } from '../../shared/api/tickets';
import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  AlertCircle,
  ChevronLeft,
  MapPin,
  Calendar,
  CheckCircle2,
  Download,
  LifeBuoy,
  Mail,
  RefreshCw,
  XCircle,
  ArrowUp,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { TicketStatusBadge } from './components/TicketStatusBadge';
import { useRefundEligibility } from '../../shared/api/support';
import { useResendTicket } from '../../shared/api/downloads';
import { ResaleListingForm } from './components/ResaleListingForm';
import { useCancelResaleListing, useResaleListingDetail } from '../../shared/api/resale';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost, apiDelete } from '../../shared/api/client';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: ticket, isLoading, isError, refetch } = useTicketDetail(id as string);
  const refundEligibility = useRefundEligibility({ ticketId: id });
  const resendTicket = useResendTicket();
  const cancelListing = useCancelResaleListing();

  const [showResaleForm, setShowResaleForm] = useState(false);

  // Fetch active listing detail for stats (upvote, comment count, asking price)
  const { data: listingDetail } = useResaleListingDetail(ticket?.resaleListingId as string);

  const handleResendTicket = () => {
    if (id) resendTicket.mutate(id);
  };

  const handleCancelResale = () => {
    if (ticket?.resaleListingId) {
      cancelListing.mutate(ticket.resaleListingId, {
        onSuccess: () => refetch(),
      });
    }
  };

  // Resale button logic
  const canResale =
    ticket?.status === 'ISSUED' &&
    ticket.resaleEnabled &&
    ticket.concertStartsAt &&
    new Date(ticket.concertStartsAt).getTime() - Date.now() > 2 * 60 * 60 * 1000;

  const isGiftable = true; // ticket?.isGiftable;
  const pendingTransfer = ticket?.pendingTransfer;

  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showCancelGiftDialog, setShowCancelGiftDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [giftError, setGiftError] = useState('');

  const initiateGiftMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiPost(`/me/tickets/${id}/transfer`, { recipientEmail: email });
    },
    onSuccess: () => {
      setShowGiftModal(false);
      setRecipientEmail('');
      setGiftError('');
      refetch(); // Gọi trực tiếp refetch thay vì invalidateQueries để đảm bảo UI update ngay lập tức
    },
    onError: (error: any) => {
      setGiftError(error.message || error.errorCode || 'Lỗi hệ thống');
    },
  });

  const cancelGiftMutation = useMutation({
    mutationFn: async () => {
      return apiDelete(`/me/tickets/${id}/transfer`);
    },
    onSuccess: () => {
      setShowCancelGiftDialog(false);
      refetch(); // Tải lại thông tin vé sau khi hủy
    },
  });

  const handleInitiateGift = () => {
    if (!recipientEmail) return;
    initiateGiftMutation.mutate(recipientEmail);
  };

  return (
    <AudienceProtectedRoute>
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <Button variant="ghost" asChild className="mb-6 -ml-4 text-muted-foreground">
          <Link to="/account/tickets">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Link>
        </Button>

        {isLoading ? (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col items-center justify-center bg-muted/30 p-12">
                <Skeleton className="h-[280px] w-[280px]" />
                <Skeleton className="mt-4 h-4 w-48" />
              </div>
              <div className="space-y-4 p-6">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ) : isError || !ticket ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>
              Không thể tải chi tiết vé.
              <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Card className="overflow-hidden border-2 shadow-xl relative">
            {ticket.status === 'VOIDED' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="rotate-[-12deg] rounded-md border-4 border-destructive px-8 py-4 text-4xl font-black text-destructive opacity-80 uppercase tracking-widest">
                  Đã Hủy
                </div>
              </div>
            )}

            <CardContent className="p-0">
              <div className="flex flex-col items-center justify-center bg-white p-8 dark:bg-zinc-100">
                {ticket.status === 'LISTED_FOR_RESALE' ||
                ticket.status === 'TRANSFERRED' ||
                ticket.status === 'TRANSFER_PENDING' ? (
                  <div className="flex h-[280px] w-[280px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-zinc-500">
                    <AlertCircle className="mb-2 h-8 w-8" />
                    <p className="text-sm font-medium">Mã QR bị ẩn</p>
                    <p className="mt-1 text-xs">
                      {ticket.status === 'TRANSFER_PENDING'
                        ? 'Vé đang chờ nhận tặng'
                        : 'Vé đang được bán lại hoặc đã chuyển nhượng'}
                    </p>
                    {ticket.status === 'TRANSFER_PENDING' && pendingTransfer && (
                      <div className="mt-4 pt-4 border-t border-dashed border-zinc-300 w-full text-left space-y-2">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">Người nhận</span>
                          <span className="text-sm font-medium">
                            {pendingTransfer.recipientEmail}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">Hết hạn sau</span>
                          <span className="text-sm font-medium">
                            {Math.round(
                              (new Date(pendingTransfer.expiresAt).getTime() - Date.now()) /
                                (1000 * 60 * 60),
                            )}{' '}
                            giờ
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : ticket.qrPayload ? (
                  <div className="relative">
                    <QRCodeSVG
                      value={ticket.qrPayload}
                      size={280}
                      level="H"
                      className={`rounded-lg ${ticket.status === 'CHECKED_IN' ? 'opacity-50' : ''}`}
                    />
                    {ticket.status === 'CHECKED_IN' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CheckCircle2 className="h-24 w-24 text-blue-500 bg-white rounded-full p-2" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-[280px] w-[280px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-zinc-500">
                    <AlertCircle className="mb-2 h-8 w-8" />
                    <p className="text-sm font-medium">Mã QR không khả dụng</p>
                    <p className="mt-1 text-xs">Vui lòng tải lại trang</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 text-zinc-900 border-zinc-300"
                      onClick={() => refetch()}
                    >
                      Tải lại
                    </Button>
                  </div>
                )}

                <p className="mt-6 text-center text-xs font-medium text-zinc-500">
                  {ticket.status === 'LISTED_FOR_RESALE'
                    ? 'Đang chờ người mua'
                    : 'Tăng độ sáng màn hình để quét dễ hơn'}
                </p>
              </div>

              <div className="border-t-2 border-dashed bg-muted/10 p-6 sm:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold leading-tight">{ticket.concertTitle}</h2>
                    <p className="mt-1 font-mono text-sm font-medium text-muted-foreground">
                      {ticket.ticketNumber}
                    </p>
                  </div>
                  <TicketStatusBadge status={ticket.status} />
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">Thời gian</p>
                      <p className="text-muted-foreground">
                        {new Date(ticket.concertStartsAt).toLocaleString('vi-VN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">Địa điểm</p>
                      <p className="text-muted-foreground">Nhà thi đấu, TP.HCM</p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg bg-muted p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Loại vé</p>
                      <p className="font-semibold">{ticket.ticketTypeName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Khu vực</p>
                      <p className="font-semibold">{ticket.ticketTypeCode}</p>
                    </div>
                  </div>

                  {ticket.status === 'CHECKED_IN' && ticket.checkedInAt && (
                    <div className="mt-4 rounded-lg bg-blue-500/10 p-4 text-sm text-blue-600 dark:text-blue-400">
                      <p className="font-medium flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Đã check-in thành công
                      </p>
                      <p className="mt-1">
                        Lúc: {new Date(ticket.checkedInAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  )}

                  {isGiftable && !showGiftModal && (
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => setShowGiftModal(true)}
                    >
                      Tặng vé cho bạn bè
                    </Button>
                  )}

                  {showGiftModal && (
                    <div className="mt-4 rounded-lg bg-zinc-50 border p-4 space-y-3">
                      <p className="text-sm font-medium">Nhập email người nhận vé:</p>
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="friend@example.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Người nhận có 48 giờ để chấp nhận vé này.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleInitiateGift}
                          disabled={initiateGiftMutation.isPending || !recipientEmail}
                        >
                          {initiateGiftMutation.isPending ? 'Đang xử lý...' : 'Xác nhận tặng'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowGiftModal(false)}>
                          Hủy
                        </Button>
                      </div>
                      {giftError && <p className="text-xs text-destructive">{giftError}</p>}
                    </div>
                  )}

                  {ticket.status === 'TRANSFER_PENDING' && (
                    <Dialog open={showCancelGiftDialog} onOpenChange={setShowCancelGiftDialog}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" className="w-full mt-4">
                          Hủy tặng vé
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Hủy tặng vé?</DialogTitle>
                          <DialogDescription>
                            Bạn có chắc chắn muốn hủy lời mời tặng vé này không? Mã nhận vé của
                            người nhận sẽ không còn hiệu lực.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="ghost" onClick={() => setShowCancelGiftDialog(false)}>
                            Đóng
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => cancelGiftMutation.mutate()}
                            disabled={cancelGiftMutation.isPending}
                          >
                            {cancelGiftMutation.isPending ? 'Đang hủy...' : 'Đồng ý hủy'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  {canResale && !showResaleForm && (
                    <Button className="w-full mt-4" onClick={() => setShowResaleForm(true)}>
                      Bán lại vé
                    </Button>
                  )}

                  {showResaleForm && ticket.originalPriceVnd && ticket.resaleMaxPricePercent && (
                    <ResaleListingForm
                      ticketId={ticket.id}
                      originalPriceVnd={ticket.originalPriceVnd}
                      maxPricePercent={ticket.resaleMaxPricePercent}
                      onCancel={() => setShowResaleForm(false)}
                      onSuccess={() => {
                        setShowResaleForm(false);
                        refetch();
                      }}
                    />
                  )}

                  {ticket.status === 'LISTED_FOR_RESALE' && (
                    <div className="mt-4 space-y-3">
                      {/* Listing stats */}
                      {listingDetail && (
                        <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                              Đang rao bán
                            </span>
                            <span className="text-lg font-bold text-orange-600">
                              {Number(listingDetail.askingPriceVnd ?? 0).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <ArrowUp className="h-3.5 w-3.5" />
                              {listingDetail.upvoteCount ?? 0} upvote
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3.5 w-3.5" />
                              {listingDetail.commentCount ?? 0} bình luận
                            </span>
                          </div>
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleCancelResale}
                        disabled={cancelListing.isPending}
                      >
                        <XCircle className="mr-2 h-4 w-4" />{' '}
                        {cancelListing.isPending ? 'Đang huỷ...' : 'Hủy bán'}
                      </Button>
                    </div>
                  )}

                  {ticket.status === 'TRANSFERRED' && (
                    <div className="mt-4 rounded-lg bg-muted p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <TrendingUp className="h-4 w-4 text-primary" /> Thông tin chuyển nhượng
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground text-xs">Ngày bán</div>
                          <div className="font-medium">
                            {ticket.checkedInAt
                              ? new Date(ticket.checkedInAt).toLocaleDateString('vi-VN')
                              : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Trạng thái thanh toán</div>
                          <div className="font-medium">Xem lịch sử bán</div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild className="w-full mt-2">
                        <Link to="/account/transactions">Xem lịch sử bán vé</Link>
                      </Button>
                    </div>
                  )}

                  <div className="mt-6 rounded-lg border bg-background p-4 print:hidden">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold">
                      <LifeBuoy className="h-4 w-4 text-primary" />
                      Hỗ trợ vé
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button variant="outline" asChild>
                        <Link to={`/account/support?ticketId=${ticket.id}`}>
                          <LifeBuoy className="mr-2 h-4 w-4" />
                          Liên hệ hỗ trợ
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        asChild
                        disabled={
                          ticket.status === 'LISTED_FOR_RESALE' || ticket.status === 'TRANSFERRED'
                        }
                      >
                        <Link to={`/account/tickets/${ticket.id}/download`}>
                          <Download className="mr-2 h-4 w-4" />
                          Tải vé
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleResendTicket}
                        disabled={
                          resendTicket.isPending ||
                          ticket.status === 'LISTED_FOR_RESALE' ||
                          ticket.status === 'TRANSFERRED'
                        }
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        {resendTicket.isPending ? 'Đang gửi...' : 'Gửi lại email'}
                      </Button>
                      <Button
                        variant="outline"
                        asChild
                        disabled={
                          !refundEligibility.data?.eligible ||
                          ticket.status === 'LISTED_FOR_RESALE' ||
                          ticket.status === 'TRANSFERRED'
                        }
                      >
                        <Link to={`/account/support?ticketId=${ticket.id}&tab=refund`}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Yêu cầu hoàn tiền
                        </Link>
                      </Button>
                    </div>
                    {refundEligibility.data && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {refundEligibility.data.eligible
                          ? refundEligibility.data.message
                          : `Hoàn tiền chưa khả dụng: ${refundEligibility.data.message}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AudienceProtectedRoute>
  );
}
