import { useParams, Link } from 'react-router-dom';
import { useSellerProfile } from '../../shared/api/trust';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Skeleton } from '../../components/ui/skeleton';
import { ShoppingBag, ShieldCheck, CalendarDays } from 'lucide-react';
import { Button } from '../../components/ui/button';

export function SellerProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: profile, isLoading } = useSellerProfile(userId as string);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl flex flex-col items-center space-y-6">
        <Skeleton className="w-24 h-24 rounded-full" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-32" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-xl text-muted-foreground font-medium">Không tìm thấy thông tin người bán.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex flex-col items-center mb-10">
        <Avatar className="w-24 h-24 mb-5 border-4 border-muted shadow-sm">
          <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
            {profile.displayName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <h1 className="text-3xl font-extrabold flex items-center gap-2 tracking-tight">
          {profile.displayName}
          {profile.tier !== 'NEW' && <ShieldCheck className="text-blue-500 w-7 h-7" />}
        </h1>
        
        <Badge variant={profile.tier === 'TOP_SELLER' ? 'default' : 'secondary'} className="mt-3 text-xs uppercase px-3 py-1">
          {profile.tier.replace('_', ' ')}
        </Badge>
        
        <div className="flex flex-wrap justify-center gap-6 mt-6 text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full">
            <ShoppingBag className="w-4 h-4 text-primary" /> {profile.completedSalesCount} giao dịch thành công
          </div>
          <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full">
            <CalendarDays className="w-4 h-4 text-primary" /> Tham gia {new Date(profile.memberSince).getFullYear()}
          </div>
        </div>
      </div>

      <Separator className="mb-10" />

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Vé đang bán</h2>
        <Badge variant="outline" className="text-sm">{profile.activeListings?.length || 0} vé</Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profile.activeListings?.map((listing: any) => (
          <Card key={listing.id} className="transition-all hover:shadow-md hover:border-primary/20">
            <CardContent className="p-6 flex flex-col h-full">
              <h3 className="font-bold text-lg line-clamp-2 leading-tight mb-2">{listing.concert.title}</h3>
              <div className="text-sm text-muted-foreground mb-6">
                Loại vé: <span className="font-semibold text-foreground">{listing.ticketType.name}</span>
              </div>
              
              <div className="mt-auto pt-4 border-t flex justify-between items-center">
                <span className="text-xl font-black text-primary tracking-tight">
                  {listing.askingPriceVnd.toLocaleString('vi-VN')} đ
                </span>
                <Button asChild size="sm" className="font-semibold">
                  <Link to={`/events/${listing.concert.slug}/resale/${listing.id}`}>Chi tiết</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {profile.activeListings?.length === 0 && (
        <div className="text-center py-16 px-4 text-muted-foreground bg-muted/20 border border-dashed rounded-xl">
          <p className="font-medium text-lg">Người bán này hiện không có vé nào đang bán.</p>
        </div>
      )}
    </div>
  );
}
