import { useState } from 'react';
import { updateMyPassword } from '../../shared/api/profile';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';

export function PasswordChangeForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const currentPassword = String(formData.get('currentPassword') ?? '');
    const newPassword = String(formData.get('newPassword') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await updateMyPassword({ currentPassword, newPassword });
      setSuccess(true);
      form.reset();
    } catch (err: any) {
      setError(err.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert className="border-green-500 text-green-600"><AlertDescription>Đổi mật khẩu thành công</AlertDescription></Alert>}

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="currentPassword">Mật khẩu hiện tại</label>
        <Input id="currentPassword" name="currentPassword" type="password" required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="newPassword">Mật khẩu mới</label>
        <Input id="newPassword" name="newPassword" type="password" required minLength={8} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Đang đổi...' : 'Đổi mật khẩu'}
      </Button>
    </form>
  );
}
