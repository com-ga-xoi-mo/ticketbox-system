import React, { useState, useEffect } from 'react';
import { useAdminArtists, useCreateArtistMutation } from './hooks';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { Badge } from '../../../shared/ui/badge';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export function ArtistsPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handler);
  }, [query]);

  const { data, isLoading, error } = useAdminArtists({
    ...(debouncedQuery ? { q: debouncedQuery } : {}),
    ...(status ? { status } : {}),
    limit,
    offset: page * limit,
  });

  const createMutation = useCreateArtistMutation();

  const handleCreate = () => {
    const slug = prompt('Nhập slug nghệ sĩ:');
    if (!slug) return;
    const displayName = prompt('Nhập tên hiển thị nghệ sĩ:');
    if (!displayName) return;

    createMutation.mutate(
      { slug, displayName, status: 'ACTIVE' },
      {
        onSuccess: () => toast.success('Đã tạo nghệ sĩ'),
        onError: (err: any) => toast.error(err.message || 'Tạo nghệ sĩ thất bại'),
      }
    );
  };

  return (
    <div className="p-6 md:p-10 min-h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-on-surface">Danh mục nghệ sĩ</h1>
          <p className="text-sm text-on-surface-variant font-mono">Quản lý nghệ sĩ</p>
        </div>
        <Button onClick={handleCreate}>
          <span className="material-symbols-outlined mr-2">add</span>
          Thêm nghệ sĩ
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Tìm kiếm nghệ sĩ..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-lg border border-white/10 bg-surface-container px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="INACTIVE">Không hoạt động</option>
        </select>
      </div>

      {isLoading ? (
        <div>Đang tải...</div>
      ) : error ? (
        <div className="text-error">Lỗi tải danh sách nghệ sĩ</div>
      ) : (
        <div className="glass-panel overflow-hidden rounded-xl border border-white/5">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold text-on-surface">Nghệ sĩ</th>
                <th className="px-6 py-4 font-semibold text-on-surface">Slug</th>
                <th className="px-6 py-4 font-semibold text-on-surface">Trạng thái</th>
                <th className="px-6 py-4 font-semibold text-on-surface">Ngày tạo</th>
                <th className="px-6 py-4 font-semibold text-on-surface">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data?.items.map((artist) => (
                <tr key={artist.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {artist.avatarAsset?.publicUrl ? (
                        <img src={artist.avatarAsset.publicUrl} alt={artist.displayName} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary material-symbols-outlined">person</div>
                      )}
                      <span className="font-medium text-on-surface">{artist.displayName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{artist.slug}</td>
                  <td className="px-6 py-4">
                    <Badge variant={artist.status === 'ACTIVE' ? 'success' : 'secondary'}>
                      {artist.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {new Date(artist.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    <Link to={`/admin/artists/${artist.id}/edit`} className="text-primary hover:underline">
                      Chỉnh sửa
                    </Link>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant">
                    Không tìm thấy nghệ sĩ.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > limit && (
        <div className="mt-6 flex justify-between items-center">
          <Button
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Trước
          </Button>
          <span className="text-sm text-on-surface-variant">
            Trang {page + 1} / {Math.ceil(data.total / limit)}
          </span>
          <Button
            variant="outline"
            disabled={(page + 1) * limit >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
