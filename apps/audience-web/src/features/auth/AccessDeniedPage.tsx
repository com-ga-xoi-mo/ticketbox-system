import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export function AccessDeniedPage() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-14 text-center">
      <Card className="max-w-md border-white/70 bg-card/90 p-8 shadow-xl">
        <CardContent className="p-0">
          <div className="mb-6 text-6xl" aria-hidden="true">🚫</div>
          <h1 className="mb-3 text-2xl font-black text-foreground">Không có quyền truy cập</h1>
          <p className="mx-auto mb-8 max-w-sm text-muted-foreground">
            Tài khoản của bạn không có quyền truy cập vào trang này.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild variant="outline" className="rounded-full bg-white/70">
              <Link to="/">Về trang chủ</Link>
            </Button>
            <Button className="rounded-full" onClick={signOut}>
              Đăng xuất
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
