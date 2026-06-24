import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export function AccountPage() {
  return (
    <AudienceProtectedRoute>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="border-white/70 bg-card/90 shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-black tracking-tight">Tài khoản của tôi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Chức năng quản lý tài khoản đang được phát triển.</p>
          </CardContent>
        </Card>
      </div>
    </AudienceProtectedRoute>
  );
}
