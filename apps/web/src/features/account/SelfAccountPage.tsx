import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMyProfile, useUpdateMyProfile, useUpdateMyPassword, useUploadMyAvatar, useRemoveMyAvatar } from '../../shared/api/profile';
import { isoUtcToDateInput, dateInputToIsoUtc } from '../../shared/utils/date-mapper';
import { resolveAvatarImageUrl } from '../../shared/api/client';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { toast } from 'sonner';

type GenderValue = 'MALE' | 'FEMALE' | 'OTHER';

function toGenderValue(value: FormDataEntryValue | null): GenderValue | null {
  if (value === 'MALE' || value === 'FEMALE' || value === 'OTHER') {
    return value;
  }
  return null;
}

export const SelfAccountPage = () => {
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const updatePassword = useUpdateMyPassword();
  const uploadAvatar = useUploadMyAvatar();
  const removeAvatar = useRemoveMyAvatar();
  const [searchParams] = useSearchParams();
  
  const passwordSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchParams.get('section') === 'password' && passwordSectionRef.current) {
      passwordSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [searchParams, isLoading]);

  if (isLoading) {
    return <div className="p-8 text-slate-400">Đang tải hồ sơ...</div>;
  }

  if (!profile) {
    return <div className="p-8 text-red-400">Tải hồ sơ thất bại.</div>;
  }

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateProfile.mutate({
      displayName: String(formData.get('displayName')),
      phone: String(formData.get('phone')).trim() || null,
      dateOfBirth: dateInputToIsoUtc(String(formData.get('dateOfBirth'))),
      gender: toGenderValue(formData.get('gender')),
      addressLine: String(formData.get('addressLine')) || null,
      city: String(formData.get('city')) || null,
      district: String(formData.get('district')) || null,
    }, {
      onSuccess: () => toast.success('Cập nhật hồ sơ thành công'),
      onError: (err: any) => toast.error(err.message || 'Cập nhật thất bại')
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const newPassword = String(formData.get('newPassword'));
    const confirmPassword = String(formData.get('confirmPassword'));

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu không khớp');
      return;
    }

    updatePassword.mutate({
      currentPassword: String(formData.get('currentPassword')),
      newPassword,
    }, {
      onSuccess: () => {
        toast.success('Đổi mật khẩu thành công');
        form.reset();
      },
      onError: (err: any) => toast.error(err.message || 'Đổi mật khẩu thất bại')
    });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAvatar.mutate(file, {
        onSuccess: () => toast.success('Cập nhật ảnh đại diện thành công'),
        onError: (err: any) => toast.error(err.message || 'Tải ảnh đại diện thất bại')
      });
    }
  };

  const avatarImageUrl = resolveAvatarImageUrl(profile.avatarAssetId, profile.avatarUrl);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <h1 className="text-2xl font-bold text-white tracking-tight">Cài đặt tài khoản</h1>

      {/* Avatar Section */}
      <section className="bg-slate-900/40 border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Ảnh đại diện</h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
            {avatarImageUrl ? (
              <img src={avatarImageUrl} alt={profile.displayName || 'Ảnh đại diện'} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-medium text-slate-400">
                {profile.displayName ? profile.displayName.substring(0, 2).toUpperCase() : 'U'}
              </span>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white" disabled={uploadAvatar.isPending}>
                  {uploadAvatar.isPending ? 'Đang tải lên...' : 'Đổi ảnh đại diện'}
                </Button>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  onChange={handleAvatarUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
              {avatarImageUrl && (
                <Button 
                  variant="outline" 
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  onClick={() => removeAvatar.mutate(undefined, { onSuccess: () => toast.success('Đã xóa ảnh đại diện') })}
                  disabled={removeAvatar.isPending}
                >
                  Xóa
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-500">JPG, PNG hoặc WebP. Tối đa 2MB.</p>
          </div>
        </div>
      </section>

      {/* Profile Info Section */}
      <section className="bg-slate-900/40 border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Thông tin cá nhân</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Email</label>
              <Input value={profile.email} disabled className="bg-slate-800/50 border-white/10 text-slate-500 cursor-not-allowed" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Tên hiển thị</label>
              <Input name="displayName" defaultValue={profile.displayName} required className="bg-slate-800/50 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Số điện thoại</label>
              <Input name="phone" type="tel" defaultValue={profile.phone || ''} placeholder="+84..." className="bg-slate-800/50 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Ngày sinh</label>
              <Input name="dateOfBirth" type="date" defaultValue={isoUtcToDateInput(profile.dateOfBirth)} className="bg-slate-800/50 border-white/10 text-white [&::-webkit-calendar-picker-indicator]:invert" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Giới tính</label>
              <select name="gender" defaultValue={profile.gender || ''} className="w-full h-10 px-3 py-2 bg-slate-800/50 border border-white/10 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#4cd7f6]/50">
                <option value="">Không xác định</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Địa chỉ</label>
              <Input name="addressLine" defaultValue={profile.addressLine || ''} className="bg-slate-800/50 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Thành phố</label>
              <Input name="city" defaultValue={profile.city || ''} className="bg-slate-800/50 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Quận/Huyện</label>
              <Input name="district" defaultValue={profile.district || ''} className="bg-slate-800/50 border-white/10 text-white" />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={updateProfile.isPending} className="bg-[#4cd7f6] text-slate-900 hover:bg-[#3bc1e0]">
              {updateProfile.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </section>

      {/* Password Section */}
      <section ref={passwordSectionRef} className="bg-slate-900/40 border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Đổi mật khẩu</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Mật khẩu hiện tại</label>
            <Input name="currentPassword" type="password" required className="bg-slate-800/50 border-white/10 text-white" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Mật khẩu mới</label>
            <Input name="newPassword" type="password" minLength={8} required className="bg-slate-800/50 border-white/10 text-white" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Xác nhận mật khẩu mới</label>
            <Input name="confirmPassword" type="password" minLength={8} required className="bg-slate-800/50 border-white/10 text-white" />
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={updatePassword.isPending} className="bg-[#4cd7f6] text-slate-900 hover:bg-[#3bc1e0]">
              {updatePassword.isPending ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
};
