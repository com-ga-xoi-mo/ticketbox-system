import { renderHook, waitFor } from '@testing-library/react';
import { useArtists } from '../useArtists';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import { fetchArtists } from '../../../../shared/api/artists';

vi.mock('../../../../shared/api/artists', () => ({
  fetchArtists: vi.fn(),
}));

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useArtists', () => {
  it('should call fetchArtists with default params', async () => {
    vi.mocked(fetchArtists).mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });

    const { result } = renderHook(() => useArtists(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchArtists).toHaveBeenCalledWith({
      q: undefined,
      limit: 20,
      offset: 0,
    });
  });
});
