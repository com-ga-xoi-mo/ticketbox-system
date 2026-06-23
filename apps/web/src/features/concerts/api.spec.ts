import { describe, it, expect, vi, afterEach } from 'vitest';
import * as client from '../../shared/api/client';
import {
  listConcerts,
  getConcert,
  createConcert,
  updateConcert,
  publishConcert,
  cancelConcert,
} from './api';

vi.mock('../../shared/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

describe('concerts api functions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const organizerBase = '/organizer/concerts';
  const adminBase = '/admin/concerts';

  it('listConcerts calls get on the correct path', async () => {
    vi.mocked(client.get).mockResolvedValue([]);
    await listConcerts(organizerBase);
    expect(client.get).toHaveBeenCalledWith(organizerBase);

    await listConcerts(adminBase);
    expect(client.get).toHaveBeenCalledWith(adminBase);
  });

  it('getConcert calls get with ID', async () => {
    vi.mocked(client.get).mockResolvedValue({});
    await getConcert(organizerBase, '123');
    expect(client.get).toHaveBeenCalledWith(`${organizerBase}/123`);
  });

  it('createConcert calls post with payload', async () => {
    vi.mocked(client.post).mockResolvedValue({});
    const payload = { title: 'New Concert' };
    await createConcert(organizerBase, payload);
    expect(client.post).toHaveBeenCalledWith(organizerBase, payload);
  });

  it('updateConcert calls patch with ID and payload', async () => {
    vi.mocked(client.patch).mockResolvedValue({});
    const payload = { title: 'Updated Concert' };
    await updateConcert(organizerBase, '123', payload);
    expect(client.patch).toHaveBeenCalledWith(`${organizerBase}/123`, payload);
  });

  it('publishConcert calls post publish endpoint', async () => {
    vi.mocked(client.post).mockResolvedValue({});
    await publishConcert(organizerBase, '123');
    expect(client.post).toHaveBeenCalledWith(`${organizerBase}/123/publish`, {});
  });

  it('cancelConcert calls post cancel endpoint', async () => {
    vi.mocked(client.post).mockResolvedValue({});
    await cancelConcert(organizerBase, '123');
    expect(client.post).toHaveBeenCalledWith(`${organizerBase}/123/cancel`, {});
  });
});
