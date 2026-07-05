import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useResaleFeed, useToggleUpvote } from '../../shared/api/resale';
import { fetchConcertDetail, catalogKeys } from '../../shared/api/catalog';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Skeleton } from '../../components/ui/skeleton';
import { MessageSquare, ArrowUp, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { useAuth } from '../../shared/auth/AuthContext';

function UpvoteButton({ listing, slug }: { listing: any; slug: string }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toggle = useToggleUpvote(listing.id);

  const handleUpvote = () => {
    if (!session) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
      return;
    }
    toggle.mutate();
  };

  return (
    <Button
      variant={listing.upvotedByMe ? 'default' : 'outline'}
      className="flex-1 sm:flex-none gap-2"
      onClick={handleUpvote}
      disabled={toggle.isPending}
    >
      <ArrowUp className="w-4 h-4" /> {listing.upvoteCount ?? 0}
    </Button>
  );
}

export function ResaleMarketplacePage() {
  const { slug } = useParams<{ slug: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: concert, isLoading: concertLoading } = useQuery({
    queryKey: catalogKeys.detail(slug as string),
    queryFn: () => fetchConcertDetail(slug as string),
    enabled: !!slug,
  });

  const [sort, setSort] = useState('trending');

  const {
    data,
    isLoading: listingsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useResaleFeed({
    concertId: concert?.id,
    sort,
    limit: 20,
  });

  const listings = data?.pages.flat() ?? [];

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(handleIntersection, { threshold: 0.1 });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [handleIntersection]);

  if (concertLoading) {
    return (
      <div className="container mx-auto py-12 max-w-4xl space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full mt-8" />
      </div>
    );
  }

  if (!concert?.resaleEnabled) {
    return (
      <div className="container mx-auto py-12 max-w-2xl text-center">
        <Alert>
          <AlertTitle>Chưa hỗ trợ</AlertTitle>
          <AlertDescription>Chức năng bán lại vé chưa được ban tổ chức bật cho sự kiện này.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Thị trường bán lại (Resale)</h1>
        <p className="text-muted-foreground text-lg">{concert.title}</p>
      </div>

      <Tabs value={sort} onValueChange={setSort} className="mb-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="trending">Thịnh hành</TabsTrigger>
          <TabsTrigger value="newest">Mới nhất</TabsTrigger>
          <TabsTrigger value="price_asc">Giá thấp nhất</TabsTrigger>
          <TabsTrigger value="price_desc">Giá cao nhất</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {listingsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          listings.map((listing: any) => (
            <Card key={listing.id} className="overflow-hidden transition-colors hover:bg-muted/10">
              <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {(listing.sellerName ?? '??').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Link to={`/sellers/${listing.sellerId}`} className="font-semibold hover:underline">
                      {listing.sellerName}
                    </Link>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {listing.sellerTrustTier ?? 'NEW'}
                    </Badge>
                    <Badge className="bg-blue-500 hover:bg-blue-600 flex items-center gap-1 text-[10px]">
                      <ShieldCheck className="w-3 h-3" /> Đã xác thực
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Loại vé: <span className="font-medium text-foreground">{listing.ticketTypeName || listing.ticketTypeId}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-primary">{Number(listing.askingPriceVnd ?? 0).toLocaleString('vi-VN')} đ</span>
                    <span className="text-sm text-muted-foreground line-through">{Number(listing.originalPriceVnd ?? 0).toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <UpvoteButton listing={listing} slug={slug as string} />
                  <Button variant="outline" asChild className="flex-1 sm:flex-none gap-2">
                    <Link to={`/events/${slug}/resale/${listing.id}`}>
                      <MessageSquare className="w-4 h-4" /> {listing.commentCount ?? 0}
                    </Link>
                  </Button>
                  <Button asChild className="flex-1 sm:flex-none">
                    <Link to={`/events/${slug}/resale/${listing.id}`}>Mua ngay</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {!listingsLoading && listings.length === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-muted/30 border border-dashed rounded-lg">
            <p className="font-medium">Chưa có vé nào được bán lại.</p>
            <p className="text-sm mt-1">Hãy quay lại sau hoặc tham gia làm người bán đầu tiên!</p>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />
        {isFetchingNextPage && (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
