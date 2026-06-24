import { Link } from 'react-router-dom';
import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import { useMyProfile } from '../../shared/api/profile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { Ticket, ShoppingBag, User, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';

export function AccountPage() {
  const { data: profile, isLoading, isError, refetch } = useMyProfile();

  return (
    <AudienceProtectedRoute>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-black tracking-tight">Tài khoản của tôi</h1>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Summary */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Hồ sơ cá nhân
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : isError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Lỗi</AlertTitle>
                  <AlertDescription>
                    Không thể tải thông tin.
                    <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => refetch()}>
                      Thử lại
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : profile ? (
                <div className="space-y-1">
                  <p className="font-semibold">{profile.displayName}</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Navigation Cards */}
          <div className="grid gap-6 sm:grid-cols-2 md:col-span-2">
            <Link to="/account/orders" className="block h-full">
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    Đơn hàng của tôi
                  </CardTitle>
                  <CardDescription>
                    Xem lịch sử mua vé và trạng thái thanh toán
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/account/tickets" className="block h-full">
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-primary" />
                    Vé của tôi
                  </CardTitle>
                  <CardDescription>
                    Xem vé điện tử (QR code) và lịch sử check-in
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </AudienceProtectedRoute>
  );
}
