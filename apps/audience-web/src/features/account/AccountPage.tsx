import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import { useMyProfile } from '../../shared/api/profile';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { AlertCircle, Bell, Heart, LifeBuoy, Mail, ReceiptText, ShieldAlert, Ticket, User } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Link } from 'react-router-dom';

export function AccountPage() {
  const { data: profile, isLoading, isError, refetch } = useMyProfile();

  return (
    <AudienceProtectedRoute>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-black tracking-tight">Tài khoản của tôi</h1>

        <Card className="shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-6">
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-6 w-6 text-primary" />
              Thông tin cá nhân
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-64" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-64" />
                </div>
              </div>
            ) : isError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Lỗi</AlertTitle>
                <AlertDescription>
                  Không thể tải thông tin tài khoản.
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                    Thử lại
                  </Button>
                </AlertDescription>
              </Alert>
            ) : profile ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Họ và tên
                  </span>
                  <span className="text-lg font-semibold">{profile.displayName}</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </span>
                  <span className="text-lg">{profile.email}</span>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Phân quyền
                  </span>
                  <div className="flex gap-2">
                    {profile.roles.map((role) => (
                      <Badge key={role} variant="secondary" className="uppercase">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-primary" />
                Hỗ trợ sau mua
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tạo yêu cầu hỗ trợ, theo dõi hoàn tiền, gửi lại email vé và tải xác nhận mua.
              </p>
              <Button variant="outline" asChild>
                <Link to="/account/support">Mở trung tâm hỗ trợ</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Thông báo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Xem xác nhận mua vé, nhắc lịch và cập nhật hỗ trợ hoặc hoàn tiền.
              </p>
              <Button variant="outline" asChild>
                <Link to="/account/notifications">Xem thông báo</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-primary" />
                Đơn hàng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" asChild>
                <Link to="/account/orders">Quản lý đơn hàng</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                Vé của tôi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" asChild>
                <Link to="/account/tickets">Mở ví vé</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-500" />
                Sự kiện yêu thích
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" asChild>
                <Link to="/me/favorites">Xem danh sách</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AudienceProtectedRoute>
  );
}
