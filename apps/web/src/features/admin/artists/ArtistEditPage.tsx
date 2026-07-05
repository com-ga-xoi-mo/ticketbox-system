import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAdminArtists, useUpdateArtistMutation, useUploadArtistAvatarMutation, useUploadArtistPosterMutation } from './hooks';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { Textarea } from '../../../shared/ui/textarea';
import { toast } from 'sonner';

export function ArtistEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data } = useAdminArtists({});
  const artist = data?.items.find((a) => a.id === id);

  const updateMutation = useUpdateArtistMutation();
  const uploadAvatarMutation = useUploadArtistAvatarMutation();
  const uploadPosterMutation = useUploadArtistPosterMutation();

  const [slug, setSlug] = useState(artist?.slug || '');
  const [displayName, setDisplayName] = useState(artist?.displayName || '');
  const [bio, setBio] = useState(artist?.bio || '');
  const [status, setStatus] = useState(artist?.status || 'ACTIVE');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (artist) {
      setSlug(artist.slug);
      setDisplayName(artist.displayName);
      setBio(artist.bio || '');
      setStatus(artist.status);
    }
  }, [artist]);

  if (!artist) {
    return <div>Đang tải nghệ sĩ...</div>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      { id, payload: { slug, displayName, bio, status } },
      {
        onSuccess: () => {
          toast.success('Cập nhật nghệ sĩ thành công');
          navigate('/admin/artists');
        },
        onError: (err: any) => toast.error(err.message || 'Cập nhật nghệ sĩ thất bại'),
      }
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAvatarMutation.mutate(
        { id, file },
        {
          onSuccess: () => toast.success('Đã tải lên ảnh đại diện'),
          onError: (err: any) => toast.error(err.message || 'Tải lên ảnh đại diện thất bại'),
        }
      );
    }
  };

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPosterMutation.mutate(
        { id, file },
        {
          onSuccess: () => toast.success('Đã tải lên ảnh bìa'),
          onError: (err: any) => toast.error(err.message || 'Tải lên ảnh bìa thất bại'),
        }
      );
    }
  };

  return (
    <div className="p-6 md:p-10 min-h-full">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin/artists" className="text-on-surface-variant hover:text-on-surface">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="text-2xl font-bold">Chỉnh sửa nghệ sĩ: {artist.displayName}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-panel p-6 rounded-xl">
            <h2 className="text-lg font-bold mb-4">Thông tin cơ bản</h2>
            <div className="space-y-4">
              <Input
                label="Tên hiển thị"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <Input
                label="Đường dẫn URL (Slug)"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
              <Textarea
                label="Tiểu sử"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
              />
              <div>
                <label className="block text-sm font-medium mb-1">Trạng thái</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                  className="w-full h-10 rounded-lg border border-white/10 bg-surface-container px-3 text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <Button type="submit" loading={updateMutation.isPending}>
                Lưu thay đổi
              </Button>
            </div>
          </div>
        </form>

        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-xl">
            <h2 className="text-lg font-bold mb-4">Ảnh đại diện</h2>
            <div className="flex items-center gap-4">
              {artist.avatarAsset?.publicUrl ? (
                <img src={artist.avatarAsset.publicUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center">Chưa có ảnh đại diện</div>
              )}
              <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
              <Button onClick={() => avatarInputRef.current?.click()} loading={uploadAvatarMutation.isPending}>
                Tải lên ảnh đại diện
              </Button>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl">
            <h2 className="text-lg font-bold mb-4">Ảnh bìa</h2>
            <div className="flex flex-col gap-4">
              {artist.posterAsset?.publicUrl ? (
                <img src={artist.posterAsset.publicUrl} alt="Poster" className="w-full h-48 rounded-xl object-cover" />
              ) : (
                <div className="w-full h-48 rounded-xl bg-surface-container flex items-center justify-center">Chưa có ảnh bìa</div>
              )}
              <input type="file" ref={posterInputRef} className="hidden" accept="image/*" onChange={handlePosterChange} />
              <Button onClick={() => posterInputRef.current?.click()} loading={uploadPosterMutation.isPending}>
                Tải lên ảnh bìa
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
