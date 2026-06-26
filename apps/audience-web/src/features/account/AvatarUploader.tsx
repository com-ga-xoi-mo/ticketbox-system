import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { uploadMyAvatar, removeMyAvatar, profileKeys } from '../../shared/api/profile';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import type { MyProfileResponse } from '@ticketbox/api-types';
import { User } from 'lucide-react';
import { resolveAvatarImageUrl } from '../../shared/api/client';

export function AvatarUploader({ profile }: { profile: MyProfileResponse }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      await uploadMyAvatar(file);
      queryClient.invalidateQueries({ queryKey: profileKeys.mine() });
    } catch (err: any) {
      setError(err.message || 'Lỗi tải ảnh lên');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemove() {
    setLoading(true);
    setError(null);
    try {
      await removeMyAvatar();
      queryClient.invalidateQueries({ queryKey: profileKeys.mine() });
    } catch (err: any) {
      setError(err.message || 'Lỗi xóa ảnh');
    } finally {
      setLoading(false);
    }
  }

  const avatarImageUrl = resolveAvatarImageUrl(profile.avatarAssetId, profile.avatarUrl);

  return (
    <div className="flex flex-col sm:flex-row items-start gap-6">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-full border bg-muted flex items-center justify-center">
        {avatarImageUrl ? (
          <img src={avatarImageUrl} alt={profile.displayName || 'Avatar'} className="h-full w-full object-cover" />
        ) : (
          <User className="h-10 w-10 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={loading}>
            Đổi ảnh
          </Button>
          {avatarImageUrl && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={handleRemove} disabled={loading}>
              Xóa ảnh
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Chấp nhận JPEG, PNG, WebP. Tối đa 2MB.</p>
        <input ref={fileInputRef} type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleFileChange} />
        {error && <Alert variant="destructive" className="mt-2 py-2"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}
      </div>
    </div>
  );
}
