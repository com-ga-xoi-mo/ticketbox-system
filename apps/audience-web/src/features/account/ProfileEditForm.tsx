import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { updateMyProfile, profileKeys } from '../../shared/api/profile';
import type { MyProfileResponse } from '@ticketbox/api-types';
import { isoUtcToDateInput, dateInputToIsoUtc } from '../../shared/utils/date-mapper';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';

export function ProfileEditForm({ profile }: { profile: MyProfileResponse }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const displayName = String(formData.get('displayName') ?? '');
    const phone = String(formData.get('phone') ?? '').trim() || null;
    const dateInput = String(formData.get('dateOfBirth') ?? '');
    const dateOfBirth = dateInputToIsoUtc(dateInput);
    const gender = String(formData.get('gender') ?? '') || null;
    const addressLine = String(formData.get('addressLine') ?? '') || null;
    const city = String(formData.get('city') ?? '') || null;
    const district = String(formData.get('district') ?? '') || null;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const updated = await updateMyProfile({
        displayName,
        phone,
        dateOfBirth,
        gender: gender as any,
        addressLine,
        city,
        district,
      });
      queryClient.setQueryData(profileKeys.mine(), updated);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert className="border-green-500 text-green-600"><AlertDescription>Đã cập nhật thông tin</AlertDescription></Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="displayName">Họ và tên</label>
          <Input id="displayName" name="displayName" defaultValue={profile.displayName} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="phone">Số điện thoại</label>
          <Input id="phone" name="phone" type="tel" defaultValue={profile.phone || ''} placeholder="+84901234567" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="dateOfBirth">Ngày sinh</label>
          <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={isoUtcToDateInput(profile.dateOfBirth)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="gender">Giới tính</label>
          <select id="gender" name="gender" defaultValue={profile.gender || ''} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <option value="">(Chưa chọn)</option>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
            <option value="OTHER">Khác</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="addressLine">Địa chỉ</label>
          <Input id="addressLine" name="addressLine" defaultValue={profile.addressLine || ''} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="city">Thành phố/Tỉnh</label>
          <Input id="city" name="city" defaultValue={profile.city || ''} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="district">Quận/Huyện</label>
          <Input id="district" name="district" defaultValue={profile.district || ''} />
        </div>
      </div>
      
      <Button type="submit" disabled={loading}>
        {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
      </Button>
    </form>
  );
}
