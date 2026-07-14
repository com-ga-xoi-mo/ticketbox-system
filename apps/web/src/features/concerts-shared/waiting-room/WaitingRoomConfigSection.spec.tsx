// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { WaitingRoomConfigResponse } from '@ticketbox/api-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WaitingRoomConfigSection } from './WaitingRoomConfigSection';
import * as waitingRoomApi from './waiting-room.api';

vi.mock('../../../shared/auth/AuthContext', () => ({
  useAuth: () => ({ session: { sub: '11111111-1111-4111-8111-111111111111', roles: ['ADMIN'] } }),
}));

vi.mock('./waiting-room.api', () => ({
  getWaitingRoomConfig: vi.fn(),
  saveWaitingRoomConfig: vi.fn(),
  setWaitingRoomOverride: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const CONCERT_ID = '22222222-2222-4222-8222-222222222222';

function config(overrides: Partial<WaitingRoomConfigResponse> = {}): WaitingRoomConfigResponse {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    concertId: CONCERT_ID,
    enabled: true,
    autoActivate: true,
    manualOverride: 'NONE',
    maxConcurrency: 500,
    admissionTtlSeconds: 600,
    activateThreshold: 500,
    deactivateThreshold: 100,
    cooldownSeconds: 60,
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
    ...overrides,
  };
}

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WaitingRoomConfigSection concertId={CONCERT_ID} />
    </QueryClientProvider>,
  );
}

describe('WaitingRoomConfigSection', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(waitingRoomApi.getWaitingRoomConfig).mockResolvedValue(config());
  });

  it('uses defaults for a missing configuration without creating it', async () => {
    vi.mocked(waitingRoomApi.getWaitingRoomConfig).mockResolvedValue(null);
    renderSection();

    expect(await screen.findByText('Chưa có cấu hình. Phòng chờ hiện đang tắt.')).toBeInTheDocument();
    expect(screen.getByLabelText('Số người vào checkout cùng lúc')).toHaveValue(500);
    expect(screen.getByRole('button', { name: 'Bật ngay' })).toBeDisabled();
    expect(waitingRoomApi.saveWaitingRoomConfig).not.toHaveBeenCalled();
  });

  it('moves the toggle thumb from left to right and applies the active color', async () => {
    vi.mocked(waitingRoomApi.getWaitingRoomConfig).mockResolvedValue(config({ enabled: false }));
    renderSection();
    const toggle = await screen.findByRole('switch', { name: 'Bật phòng chờ' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle.firstElementChild).toHaveClass('left-1');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).toHaveClass('bg-[linear-gradient(to_right,#db4df5,#813edc)]');
    expect(toggle.firstElementChild).toHaveClass('right-1');
  });

  it('keeps a loading state isolated and allows retry after a non-404 load failure', async () => {
    vi.mocked(waitingRoomApi.getWaitingRoomConfig)
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce(config());
    renderSection();

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải cấu hình phòng chờ');
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(waitingRoomApi.getWaitingRoomConfig).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Tự động theo tải')).toBeInTheDocument();
  });

  it('renders a local loading state while config is still loading', async () => {
    let resolve!: (value: WaitingRoomConfigResponse) => void;
    vi.mocked(waitingRoomApi.getWaitingRoomConfig).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    renderSection();

    expect(await screen.findByRole('status', { name: 'Đang tải cấu hình phòng chờ' })).toBeInTheDocument();
    resolve(config());
    expect(await screen.findByText('Tự động theo tải')).toBeInTheDocument();
  });

  it('shows a persisted configuration and validates threshold before save', async () => {
    renderSection();
    const activate = await screen.findByLabelText('Ngưỡng tự bật');
    await userEvent.clear(activate);
    await userEvent.type(activate, '100');
    await userEvent.clear(screen.getByLabelText('Ngưỡng tự tắt'));
    await userEvent.type(screen.getByLabelText('Ngưỡng tự tắt'), '100');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }));

    expect(await screen.findByText('Ngưỡng tự tắt phải nhỏ hơn ngưỡng tự bật.')).toBeInTheDocument();
    expect(waitingRoomApi.saveWaitingRoomConfig).not.toHaveBeenCalled();
  });

  it('saves a valid draft through the shared API', async () => {
    vi.mocked(waitingRoomApi.saveWaitingRoomConfig).mockResolvedValue(config({ maxConcurrency: 9 }));
    renderSection();
    const concurrency = await screen.findByLabelText('Số người vào checkout cùng lúc');
    await userEvent.clear(concurrency);
    await userEvent.type(concurrency, '9');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }));

    await waitFor(() => expect(waitingRoomApi.saveWaitingRoomConfig).toHaveBeenCalledWith(CONCERT_ID, {
      enabled: true,
      autoActivate: true,
      manualOverride: 'NONE',
      maxConcurrency: 9,
      admissionTtlSeconds: 600,
      activateThreshold: 500,
      deactivateThreshold: 100,
      cooldownSeconds: 60,
    }));
    expect(screen.getByText('Giới hạn này rất thấp và có thể khiến người dùng chờ lâu. Chỉ nên dùng cho demo hoặc kiểm thử.')).toBeInTheDocument();
  });

  it('preserves a failed-save draft and prevents duplicate saves while pending', async () => {
    let reject!: (error: Error) => void;
    vi.mocked(waitingRoomApi.saveWaitingRoomConfig).mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
    renderSection();
    const concurrency = await screen.findByLabelText('Số người vào checkout cùng lúc');
    await userEvent.clear(concurrency);
    await userEvent.type(concurrency, '9');
    const save = screen.getByRole('button', { name: 'Lưu cấu hình' });
    await userEvent.click(save);
    await userEvent.click(save);
    expect(waitingRoomApi.saveWaitingRoomConfig).toHaveBeenCalledTimes(1);
    expect(save).toBeDisabled();

    reject(new Error('Không thể kết nối'));
    await waitFor(() => expect(save).not.toBeDisabled());
    expect(screen.getByDisplayValue('9')).toBeInTheDocument();
  });

  it('applies an immediate override without discarding unsaved fields', async () => {
    vi.mocked(waitingRoomApi.setWaitingRoomOverride).mockResolvedValue(config({ manualOverride: 'FORCE_ON' }));
    renderSection();
    const concurrency = await screen.findByLabelText('Số người vào checkout cùng lúc');
    await userEvent.clear(concurrency);
    await userEvent.type(concurrency, '9');
    await userEvent.click(screen.getByRole('button', { name: 'Bật ngay' }));

    await waitFor(() => expect(waitingRoomApi.setWaitingRoomOverride).toHaveBeenCalledWith(CONCERT_ID, { manualOverride: 'FORCE_ON' }));
    expect(screen.getByDisplayValue('9')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Bật ngay' })).toHaveAttribute('aria-checked', 'true');
  });

  it('sends all supported quick override payloads', async () => {
    vi.mocked(waitingRoomApi.setWaitingRoomOverride).mockImplementation(async (_id, payload) => config({ manualOverride: payload.manualOverride }));
    renderSection();
    await screen.findByRole('button', { name: 'Bật ngay' });

    await userEvent.click(screen.getByRole('button', { name: 'Tắt ngay' }));
    await waitFor(() => expect(waitingRoomApi.setWaitingRoomOverride).toHaveBeenLastCalledWith(CONCERT_ID, { manualOverride: 'FORCE_OFF' }));
    await userEvent.click(screen.getByRole('button', { name: 'Trả về tự động' }));
    await waitFor(() => expect(waitingRoomApi.setWaitingRoomOverride).toHaveBeenLastCalledWith(CONCERT_ID, { manualOverride: 'NONE' }));
  });

  it('keeps segmented selection in the draft until Save and locks quick actions while pending', async () => {
    let resolve!: (value: WaitingRoomConfigResponse) => void;
    vi.mocked(waitingRoomApi.saveWaitingRoomConfig).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    renderSection();
    await screen.findByRole('button', { name: 'Bật ngay' });
    await userEvent.click(screen.getByRole('radio', { name: 'Tắt ngay' }));
    expect(waitingRoomApi.setWaitingRoomOverride).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }));

    await waitFor(() => expect(waitingRoomApi.saveWaitingRoomConfig).toHaveBeenCalledWith(CONCERT_ID, expect.objectContaining({ manualOverride: 'FORCE_OFF' })));
    expect(screen.getByRole('button', { name: 'Bật ngay' })).toBeDisabled();
    resolve(config({ manualOverride: 'FORCE_OFF' }));
  });

  it('does not submit the parent concert form when Enter is pressed in a number input', async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <form onSubmit={onSubmit}>
          <WaitingRoomConfigSection concertId={CONCERT_ID} />
        </form>
      </QueryClientProvider>,
    );

    const concurrency = await screen.findByLabelText('Số người vào checkout cùng lúc');
    fireEvent.keyDown(concurrency, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
