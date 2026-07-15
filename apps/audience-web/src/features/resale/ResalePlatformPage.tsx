import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useResaleFeed, useToggleUpvote } from '../../shared/api/resale';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Skeleton } from '../../components/ui/skeleton';
import { Input } from '../../components/ui/input';
import { MessageSquare, ArrowUp, ShieldCheck, Search, CalendarIcon } from 'lucide-react';
import { useAuth } from '../../shared/auth/AuthContext';

function UpvoteButton({ listing }: { listing: any }) {
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

export function ResalePlatformPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const concertIdParam = searchParams.get('concertId') || undefined;

  const [sort, setSort] = useState('trending');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    data,
    isLoading: listingsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useResaleFeed({
    concertId: concertIdParam,
    sort,
    search: debouncedSearch || undefined,
    priceMin: priceMin ? Number(priceMin) : undefined,
    priceMax: priceMax ? Number(priceMax) : undefined,
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
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(handleIntersection, { threshold: 0.1 });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [handleIntersection]);

  return (
    <div className="container mx-auto py-8 max-w-5xl px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Thị trường bán lại (Resale)</h1>
        <p className="text-muted-foreground text-lg">Khám phá vé bán lại từ các sự kiện</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
        <Tabs value={sort} onValueChange={setSort} className="w-full md:w-auto">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="trending">Thịnh hành</TabsTrigger>
            <TabsTrigger value="newest">Mới nhất</TabsTrigger>
            <TabsTrigger value="price_asc">Giá thấp nhất</TabsTrigger>
            <TabsTrigger value="price_desc">Giá cao nhất</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-muted/30 p-4 rounded-lg border">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên sự kiện..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Giá từ (VNĐ)"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Đến (VNĐ)"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
          />
        </div>
        <div>
          {concertIdParam && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                searchParams.delete('concertId');
                setSearchParams(searchParams);
              }}
            >
              Xóa bộ lọc sự kiện
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {listingsLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))
          : listings.map((listing: any) => (
              <Card
                key={listing.id}
                className="overflow-hidden transition-colors hover:bg-muted/10"
              >
                <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                  <div className="space-y-3 flex-1">
                    {listing.concertTitle && (
                      <div className="mb-2">
                        <Link
                          to={`/events/${listing.concertSlug}`}
                          className="text-lg font-bold hover:underline line-clamp-1"
                        >
                          {listing.concertTitle}
                        </Link>
                        {listing.concertStartsAt && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <CalendarIcon className="w-3 h-3" />
                            {new Date(listing.concertStartsAt).toLocaleString('vi-VN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {(listing.sellerName ?? '??').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Link
                        to={`/sellers/${listing.sellerId}`}
                        className="font-semibold hover:underline"
                      >
                        {listing.sellerName}
                      </Link>
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {listing.sellerTrustTier ?? 'NEW'}
                      </Badge>
                      <Badge className="bg-blue-500 hover:bg-blue-600 flex items-center gap-1 text-[10px]">
                        <ShieldCheck className="w-3 h-3" /> Đã xác thực
                      </Badge>
                      {listing.currentOrderId && (
                        <Badge variant="outline">
                          {listing.currentOrderStatus === 'RESERVED'
                            ? 'Bạn đang giữ vé'
                            : 'Giao dịch đang xử lý'}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Loại vé:{' '}
                      <span className="font-medium text-foreground">
                        {listing.ticketTypeName || listing.ticketTypeId}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-primary">
                        {Number(listing.askingPriceVnd ?? 0).toLocaleString('vi-VN')} đ
                      </span>
                      <span className="text-sm text-muted-foreground line-through">
                        {Number(listing.originalPriceVnd ?? 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
                    <UpvoteButton listing={listing} />
                    <Button variant="outline" asChild className="flex-1 md:flex-none gap-2">
                      <Link to={`/resale/${listing.id}`}>
                        <MessageSquare className="w-4 h-4" /> {listing.commentCount ?? 0}
                      </Link>
                    </Button>
                    {listing.currentOrderId ? (
                      <Button asChild className="flex-1 md:flex-none">
                        <Link to={`/resale/orders/${listing.currentOrderId}`}>
                          {listing.currentOrderStatus === 'RESERVED'
                            ? 'Tiếp tục thanh toán'
                            : 'Theo dõi giao dịch'}
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild className="flex-1 md:flex-none">
                        <Link to={`/resale/${listing.id}`}>Mua ngay</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

        {!listingsLoading && listings.length === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-muted/30 border border-dashed rounded-lg">
            <p className="font-medium">Chưa có vé nào được bán lại.</p>
            <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc quay lại sau!</p>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />
        {isFetchingNextPage && (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
