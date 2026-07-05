import { describe, it, expect, vi, afterEach } from 'vitest';
import * as client from '../../../shared/api/client';
import {
  listConcerts,
  getConcert,
  createConcert,
  updateConcert,
  publishConcert,
  cancelConcert,
  uploadPoster,
  uploadBanner,
  replaceArtists,
  ORGANIZER_CONCERTS_PATH,
} from './api';

vi.mock('../../../shared/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  postFormData: vi.fn(),
}));

describe('organizer concerts api functions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('listConcerts calls get on the correct path', async () => {
    vi.mocked(client.get).mockResolvedValue([]);
    await listConcerts();
    expect(client.get).toHaveBeenCalledWith(ORGANIZER_CONCERTS_PATH);
  });

  it('getConcert calls get with ID', async () => {
    vi.mocked(client.get).mockResolvedValue({});
    await getConcert('123');
    expect(client.get).toHaveBeenCalledWith(`${ORGANIZER_CONCERTS_PATH}/123`);
  });

  it('createConcert calls post with payload', async () => {
    vi.mocked(client.post).mockResolvedValue({});
    const payload = { title: 'New Concert' };
    await createConcert(payload);
    expect(client.post).toHaveBeenCalledWith(ORGANIZER_CONCERTS_PATH, payload);
  });

  it('updateConcert calls patch with ID and payload', async () => {
    vi.mocked(client.patch).mockResolvedValue({});
    const payload = { title: 'Updated Concert' };
    await updateConcert('123', payload);
    expect(client.patch).toHaveBeenCalledWith(`${ORGANIZER_CONCERTS_PATH}/123`, payload);
  });

  it('publishConcert calls post publish endpoint', async () => {
    vi.mocked(client.post).mockResolvedValue({});
    await publishConcert('123');
    expect(client.post).toHaveBeenCalledWith(`${ORGANIZER_CONCERTS_PATH}/123/publish`, {});
  });

  it('cancelConcert calls post cancel endpoint', async () => {
    vi.mocked(client.post).mockResolvedValue({});
    await cancelConcert('123');
    expect(client.post).toHaveBeenCalledWith(`${ORGANIZER_CONCERTS_PATH}/123/cancel`, {});
  });

  it('uploadPoster posts multipart form data to the poster endpoint', async () => {
    vi.mocked(client.postFormData).mockResolvedValue({ asset: { id: 'a1', publicUrl: 'https://cdn/x.png' } });
    const file = new File(['x'], 'poster.png', { type: 'image/png' });
    await uploadPoster('123', file);
    expect(client.postFormData).toHaveBeenCalledTimes(1);
    const [path, formData] = vi.mocked(client.postFormData).mock.calls[0];
    expect(path).toBe(`${ORGANIZER_CONCERTS_PATH}/123/poster`);
    expect(formData).toBeInstanceOf(FormData);
    expect((formData as FormData).get('file')).toBe(file);
  });

  it('uploadBanner posts multipart form data to the banner endpoint', async () => {
    vi.mocked(client.postFormData).mockResolvedValue({ asset: { id: 'a2', publicUrl: 'https://cdn/b.png' } });
    const file = new File(['x'], 'banner.png', { type: 'image/png' });
    await uploadBanner('123', file);
    const [path, formData] = vi.mocked(client.postFormData).mock.calls[0];
    expect(path).toBe(`${ORGANIZER_CONCERTS_PATH}/123/banner`);
    expect((formData as FormData).get('file')).toBe(file);
  });

  it('replaceArtists puts the exact replacement payload to the artists endpoint', async () => {
    vi.mocked(client.put).mockResolvedValue({ success: true });
    const payload = { artists: [{ artistId: 'ar1', displayOrder: 0 }, { artistId: 'ar2', displayOrder: 1 }] };
    await replaceArtists('123', payload);
    expect(client.put).toHaveBeenCalledWith(`${ORGANIZER_CONCERTS_PATH}/123/artists`, payload);
  });
});
