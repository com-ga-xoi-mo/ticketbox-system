import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import { useAuth } from '../../shared/auth/AuthContext';
import { loginRequest } from '../../shared/api/auth';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const returnTo = searchParams.get('returnTo');
  const stateFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const from = returnTo || stateFrom || '/';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values: LoginFormValues = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    };
    setError(null);
    setLoading(true);
    try {
      const token = await loginRequest(values);
      signIn(token);
      navigate(from, { replace: true });
    } catch {
      setError('Email hoặc mật khẩu không đúng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_25%_20%,oklch(0.83_0.17_20/0.45),transparent_24rem),radial-gradient(circle_at_78%_10%,oklch(0.88_0.17_70/0.35),transparent_24rem)]" />
      <Card className="w-full max-w-md border-white/70 bg-card/90 shadow-[0_28px_80px_rgb(15_23_42/0.18)] backdrop-blur">
        <CardHeader className="items-center text-center">
          <Link to="/" className="grid size-14 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/20" aria-label="Về trang chủ TicketBox">
            <Ticket className="size-7" aria-hidden="true" />
          </Link>
          <CardTitle className="text-2xl font-black">Đăng nhập TicketBox</CardTitle>
          <p className="text-sm text-muted-foreground">Tiếp tục để quản lý vé và trải nghiệm của bạn.</p>
        </CardHeader>
        <CardContent>

        {error && (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="email">Email</label>
              <Input id="email" name="email" type="email" placeholder="email@example.com" autoComplete="email" required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="password">Mật khẩu</label>
              <Input id="password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required />
            </div>

            <Button type="submit" className="h-11 w-full rounded-full shadow-xl shadow-primary/20" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground mt-4">
              Chưa có tài khoản? <Link to="/register" className="text-primary hover:underline">Đăng ký ngay</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
