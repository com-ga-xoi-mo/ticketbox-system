import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import { resetPasswordRequest } from '../../shared/api/auth';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Liên kết không hợp lệ hoặc đã hết hạn.');
    }
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    
    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get('newPassword') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await resetPasswordRequest(token, newPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError('Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white">
              <Ticket className="h-6 w-6" />
              <span className="text-xl font-bold tracking-wider">TICKETBOX</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">Đặt lại mật khẩu</CardTitle>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="text-center">
                <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:underline">
                  Yêu cầu liên kết mới
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 text-green-900 border-green-200">
                <AlertDescription>
                  Mật khẩu đã được đặt lại thành công. Đang chuyển hướng...
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="Mật khẩu mới (ít nhất 8 ký tự)"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Xác nhận mật khẩu mới"
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
