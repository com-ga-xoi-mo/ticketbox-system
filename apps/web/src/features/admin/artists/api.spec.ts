import { describe, it, expect, vi, afterEach } from 'vitest';
import * as client from '../../../shared/api/client';
import {
  listArtists,
  createArtist,
  updateArtist,
  uploadArtistAvatar,
  uploadArtistPoster,
  ADMIN_ARTISTS_PATH,
} from './api';

vi.mock('../../../shared/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  postFormData: vi.fn(),
}));

describe('admin artists api functions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('listArtists serializes search, status, and pagination params into the query string', async () => {
    vi.mocked(client.get).mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    await listArtists({ q: 'mid', status: 'ACTIVE', limit: 20, offset: 40 });
    const [path] = vi.mocked(client.get).mock.calls[0];
    expect(path.startsWith(`${ADMIN_ARTISTS_PATH}?`)).toBe(true);
    const params = new URLSearchParams(path.split('?')[1]);
    expect(params.get('q')).toBe('mid');
    expect(params.get('status')).toBe('ACTIVE');
    expect(params.get('limit')).toBe('20');
    expect(params.get('offset')).toBe('40');
  });

  it('createArtist posts the payload to the admin artists path', async () => {
    vi.mocked(client.post).mockResolvedValue({});
    const payload = { slug: 'the-midnight', displayName: 'The Midnight', status: 'ACTIVE' };
    await createArtist(payload);
    expect(client.post).toHaveBeenCalledWith(ADMIN_ARTISTS_PATH, payload);
  });

  it('updateArtist patches the payload to the artist path', async () => {
    vi.mocked(client.patch).mockResolvedValue({});
    const payload = { displayName: 'Renamed', status: 'INACTIVE' };
    await updateArtist('ar1', payload);
    expect(client.patch).toHaveBeenCalledWith(`${ADMIN_ARTISTS_PATH}/ar1`, payload);
  });

  it('uploadArtistAvatar posts multipart form data to the avatar endpoint', async () => {
    vi.mocked(client.postFormData).mockResolvedValue({ assetId: 'a1', publicUrl: 'https://cdn/x.png' });
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    await uploadArtistAvatar('ar1', file);
    const [path, formData] = vi.mocked(client.postFormData).mock.calls[0];
    expect(path).toBe(`${ADMIN_ARTISTS_PATH}/ar1/avatar`);
    expect(formData).toBeInstanceOf(FormData);
    expect((formData as FormData).get('file')).toBe(file);
  });

  it('uploadArtistPoster posts multipart form data to the poster endpoint', async () => {
    vi.mocked(client.postFormData).mockResolvedValue({ assetId: 'a2', publicUrl: 'https://cdn/p.png' });
    const file = new File(['x'], 'poster.png', { type: 'image/png' });
    await uploadArtistPoster('ar1', file);
    const [path, formData] = vi.mocked(client.postFormData).mock.calls[0];
    expect(path).toBe(`${ADMIN_ARTISTS_PATH}/ar1/poster`);
    expect((formData as FormData).get('file')).toBe(file);
  });
});
