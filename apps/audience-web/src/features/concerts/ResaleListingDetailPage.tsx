import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useCallback } from 'react';
import {
  useResaleListingDetail,
  useToggleUpvote,
  useListingSSE,
  useInitiateDM,
} from '../../shared/api/resale';
import { useMyThreads } from '../../shared/api/messaging';
import { useExecuteResalePurchase } from '../../shared/api/resale-purchase';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Skeleton } from '../../components/ui/skeleton';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { ShieldCheck, ArrowUp, MessageSquare, ChevronLeft, Send } from 'lucide-react';
import { useAuth } from '../../shared/auth/AuthContext';
import { CommentThread } from './components/CommentThread';

export function ResaleListingDetailPage({ backHref }: { backHref?: string }) {
  const { slug, listingId } = useParams<{ slug: string; listingId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: listing, isLoading } = useResaleListingDetail(listingId as string);
  const { data: myThreads } = useMyThreads();
  const purchaseMutation = useExecuteResalePurchase();
  const toggleUpvote = useToggleUpvote(listingId as string);
  const initiateDM = useInitiateDM(listingId as string);

  // Local upvote state — optimistically updated by useToggleUpvote mutation
  // and also updated via SSE
  const [liveUpvoteCount, setLiveUpvoteCount] = useState<number | null>(null);
  const [liveUpvotedByMe, setLiveUpvotedByMe] = useState<boolean | null>(null);

  // SSE subscription
  useListingSSE(listingId as string, {
    onUpvoteUpdated: useCallback((data: { upvoteCount: number; upvotedByMe: boolean }) => {
      setLiveUpvoteCount(data.upvoteCount);
      setLiveUpvotedByMe(data.upvotedByMe);
    }, []),
  });

  // DM dialog state
  const [dmOpen, setDmOpen] = useState(false);
  const [dmBody, setDmBody] = useState('');

  const upvoteCount = liveUpvoteCount ?? listing?.upvoteCount ?? 0;
  const upvotedByMe = liveUpvotedByMe ?? listing?.upvotedByMe ?? false;
  const existingThread = myThreads?.find((t: any) => t.listingId === listingId);

  const handleUpvote = () => {
    if (!session) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
      return;
    }
    toggleUpvote.mutate(undefined, {
      onSuccess: (data) => {
        setLiveUpvoteCount(data.upvoteCount);
        setLiveUpvotedByMe(data.upvotedByMe);
      },
    });
  };

  const handlePurchase = () => {
    if (!session) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (confirm('Bạn có chắc chắn muốn mua vé này không? Thao tác này sẽ khoá vé và yêu cầu bạn chuyển khoản.')) {
      purchaseMutation.mutate(listingId as string);
    }
  };

  const handleMessageSeller = () => {
    if (!session) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
      return;
    }
    // If a thread for this listing already exists, navigate directly to it
    const existingThread = myThreads?.find((t: any) => t.listingId === listingId);
    if (existingThread) {
      navigate(`/account/messages/${existingThread.id}`);
      return;
    }
    // No existing thread — open dialog to send first message
    setDmOpen(true);
  };

  const handleSendDM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmBody.trim()) return;
    initiateDM.mutate(dmBody, {
      onSuccess: (data: any) => {
        setDmOpen(false);
        setDmBody('');
        // Backend returns { message, thread, isFirstSellerReply, listing }
        const threadId = data?.thread?.id ?? data?.id;
        if (threadId) navigate(`/account/messages/${threadId}`);
        else navigate('/account/messages');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 max-w-3xl space-y-8 px-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="p-12 text-center text-muted-foreground font-medium">
        Không tìm thấy vé bán lại.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
      <Button variant="ghost" asChild className="mb-6 -ml-4 text-muted-foreground hover:text-foreground">
        <Link to={backHref || `/events/${slug}/resale`}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Quay lại danh sách
        </Link>
      </Button>

      <Card className="overflow-hidden border-2 shadow-sm mb-10">
        <CardContent className="p-6 md:p-10">
          <div className="flex flex-col md:flex-row justify-between gap-10">
            {/* Left: listing info */}
            <div className="flex-1 space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">
                  {listing.concert?.title ?? listing.concertId}
                </h1>
                {listing.concert?.startsAt && (
                  <p className="text-muted-foreground text-sm">
                    {new Date(listing.concert.startsAt).toLocaleString('vi-VN', {
                      dateStyle: 'full',
                      timeStyle: 'short',
                    })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(listing.seller?.displayName ?? listing.sellerName ?? '??').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    to={`/sellers/${listing.sellerId}`}
                    className="font-semibold hover:underline text-foreground"
                  >
                    {listing.seller?.displayName ?? listing.sellerName}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {listing.sellerTrustTier ?? 'NEW'}
                    </Badge>
                    <Badge className="bg-blue-500 hover:bg-blue-600 flex items-center gap-1 text-[10px]">
                      <ShieldCheck className="w-3 h-3" /> Đã xác thực
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-sm font-medium text-muted-foreground block mb-1">Loại vé</span>
                  <span className="text-lg font-semibold">
                    {listing.ticketType?.name ?? listing.ticketTypeName ?? listing.ticketTypeId}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground block mb-1">Khu vực</span>
                  <span className="text-lg font-semibold">
                    {listing.ticketType?.code ?? '—'}
                  </span>
                </div>
              </div>

              {/* Upvote row */}
              <div className="flex items-center gap-3">
                <Button
                  variant={upvotedByMe ? 'default' : 'outline'}
                  size="sm"
                  className="gap-2"
                  onClick={handleUpvote}
                  disabled={toggleUpvote.isPending}
                >
                  <ArrowUp className="w-4 h-4" /> {upvoteCount} upvote
                </Button>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  {listing.commentCount ?? 0} bình luận
                </span>
              </div>
            </div>

            {/* Right: purchase panel */}
            <div className="bg-muted/40 p-8 rounded-xl border flex flex-col justify-center min-w-[280px]">
              <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-blue-600 mb-4">
                <ShieldCheck className="w-4 h-4" /> Xác thực bởi TicketBox
              </div>

              <div className="text-center mb-6">
                <div className="text-4xl font-black text-primary tracking-tight mb-2">
                  {Number(listing.askingPriceVnd ?? 0).toLocaleString('vi-VN')} đ
                </div>
                <div className="text-sm font-medium text-muted-foreground line-through">
                  Giá gốc: {Number(listing.originalPriceVnd ?? listing.ticketType?.priceVnd ?? 0).toLocaleString('vi-VN')} đ
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full text-base font-semibold shadow-sm"
                  onClick={handlePurchase}
                  disabled={purchaseMutation.isPending || listing.status !== 'ACTIVE'}
                >
                  {purchaseMutation.isPending ? 'Đang xử lý...' : 'Mua ngay'}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full font-medium gap-2"
                  onClick={handleMessageSeller}
                  disabled={initiateDM.isPending}
                >
                  <MessageSquare className="w-4 h-4" />
                  {existingThread ? 'Xem cuộc trò chuyện' : 'Nhắn tin người bán'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comment thread */}
      <CommentThread listingId={listingId as string} />

      {/* DM Dialog */}
      <Dialog open={dmOpen} onOpenChange={setDmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nhắn tin cho người bán</DialogTitle>
            <DialogDescription>
              Gửi tin nhắn đầu tiên để hỏi thêm về vé này.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendDM} className="space-y-4 mt-2">
            <Textarea
              value={dmBody}
              onChange={(e) => setDmBody(e.target.value)}
              placeholder="Xin chào, tôi muốn hỏi thêm về vé này..."
              rows={4}
              maxLength={1000}
              className="resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDmOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={!dmBody.trim() || initiateDM.isPending} className="gap-2">
                <Send className="w-4 h-4" />
                {initiateDM.isPending ? 'Đang gửi...' : 'Gửi'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
