import { describe, it, expect, vi, afterEach } from 'vitest';
import * as client from '../../../shared/api/client';
import {
  listConcerts,
  getConcert,
  createConcert,
  updateConcert,
  publishConcert,
  cancelConcert,
  ORGANIZER_CONCERTS_PATH,
} from './api';

vi.mock('../../../shared/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
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
});
