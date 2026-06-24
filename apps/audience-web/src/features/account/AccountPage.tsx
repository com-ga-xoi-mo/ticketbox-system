import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import { useMyProfile } from '../../shared/api/profile';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { User, AlertCircle, Mail, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';

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
      </div>
    </AudienceProtectedRoute>
  );
}
