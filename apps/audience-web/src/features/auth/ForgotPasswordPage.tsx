import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import { forgotPasswordRequest } from '../../shared/api/auth';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

export function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');

    if (!email) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await forgotPasswordRequest(email);
      setSuccess(true);
    } catch (err: any) {
      if (err.data?.message) {
        setError(err.data.message);
      } else {
        setError('Đã xảy ra lỗi khi gửi yêu cầu. Vui lòng thử lại sau.');
      }
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
          <CardTitle className="text-2xl font-semibold">Quên mật khẩu</CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 text-green-900 border-green-200">
                <AlertDescription>
                  Liên kết đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến.
                </AlertDescription>
              </Alert>
              <div className="text-center">
                <Link to="/login" className="text-sm font-medium text-blue-600 hover:underline">
                  Quay lại đăng nhập
                </Link>
              </div>
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
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email của bạn"
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </Button>
              <div className="text-center">
                <Link to="/login" className="text-sm font-medium text-blue-600 hover:underline">
                  Quay lại đăng nhập
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
