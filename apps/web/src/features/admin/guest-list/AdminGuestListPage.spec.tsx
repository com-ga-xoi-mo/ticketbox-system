// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  refetch: vi.fn(),
  batches: [] as unknown[],
  report: undefined as unknown,
}));

vi.mock('../concerts/hooks', () => ({
  useConcert: () => ({
    data: { id: '22222222-2222-4222-8222-222222222222', title: 'Summer VIP' },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));
vi.mock('./hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./hooks')>();
  return {
    ...actual,
    useGuestListBatches: () => ({
      data: mocks.batches,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
    }),
    useUploadGuestList: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
    useGuestListReport: () => ({
      data: mocks.report,
      isLoading: false,
      isError: false,
      error: null,
    }),
  };
});

import { AdminGuestListPage } from './AdminGuestListPage';

const concertId = '22222222-2222-4222-8222-222222222222';
const timestamp = '2026-07-14T12:00:00.000Z';

function batch(overrides: Record<string, unknown>) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    concertId,
    sourceName: 'vip.csv',
    checksum: 'a'.repeat(64),
    importSequence: 1,
    status: 'COMPLETED',
    reportAvailable: true,
    processingAttempt: 1,
    totalRows: 2,
    validRows: 1,
    invalidRows: 1,
    duplicateRows: 0,
    importedRows: 1,
    updatedRows: 0,
    cancelledRows: 0,
    conflictRows: 0,
    failureCode: null,
    failureMessage: null,
    startedAt: timestamp,
    completedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/admin/concerts/${concertId}/guest-list`]}>
      <Routes>
        <Route path="/admin/concerts/:id/guest-list" element={<AdminGuestListPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminGuestListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.report = undefined;
    mocks.batches = [
      batch({
        id: '33333333-3333-4333-8333-333333333333',
        importSequence: 2,
        sourceName: 'invalid.csv',
        status: 'FAILED',
        failureCode: 'INVALID_HEADER',
        failureMessage: 'CSV is missing required headers',
        completedAt: timestamp,
      }),
      batch({}),
    ];
  });

  it('shows concert context, newest-first lifecycle evidence, failure details, and no discovery control', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Guest List · Summer VIP' })).toBeInTheDocument();
    expect(screen.getByText('INVALID_HEADER')).toBeInTheDocument();
    expect(screen.getByText(/CSV is missing required headers/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Xem report' })).toHaveLength(1);
    expect(screen.queryByText(/Quét inbox/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Discover/i)).not.toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('#2 · invalid.csv');
    expect(screen.getByTestId('guest-list-history')).toHaveClass('min-w-[1480px]', 'table-fixed');
  });

  it('normalizes an empty browser MIME, uploads Base64, and shows duplicate feedback', async () => {
    mocks.mutateAsync.mockResolvedValue({
      outcome: 'IDEMPOTENT_DUPLICATE',
      batch: batch({ importSequence: 7 }),
    });
    renderPage();
    const bytes = new TextEncoder().encode(
      'guest_name,email,phone,external_ref,action\nVIP,vip@x.test,,,UPSERT',
    );
    const file = new File([bytes], 'vip.csv', { type: '' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer });
    await userEvent.upload(screen.getByLabelText('Tệp Guest List CSV'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Upload CSV' }));
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledOnce());
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      sourceName: 'vip.csv',
      contentType: 'text/csv',
      contentBase64: expect.any(String),
    });
    expect(screen.getByRole('status')).toHaveTextContent('đang dùng batch #7');
  });

  it('rejects an invalid file before upload', async () => {
    renderPage();
    const file = new File(['bad'], 'vip.txt', { type: 'text/plain' });
    await userEvent.upload(screen.getByLabelText('Tệp Guest List CSV'), file, {
      applyAccept: false,
    });
    expect(screen.getByRole('alert')).toHaveTextContent('.csv');
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it('renders validated row evidence only for a reportable batch', async () => {
    mocks.report = {
      batchId: '11111111-1111-4111-8111-111111111111',
      concertId,
      checksum: 'a'.repeat(64),
      summary: {
        totalRows: 1,
        validRows: 0,
        invalidRows: 1,
        duplicateRows: 0,
        importedRows: 0,
        updatedRows: 0,
        cancelledRows: 0,
        conflictRows: 0,
      },
      rows: [
        {
          rowNumber: 2,
          action: 'UPSERT',
          guestName: 'Bad phone',
          email: null,
          phone: 'bad',
          externalRef: null,
          disposition: 'INVALID',
          reasonCode: 'ROW_VALIDATION',
          reasonMessage: 'Invalid phone',
        },
      ],
    };
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Xem report' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('ROW_VALIDATION: Invalid phone');
    expect(screen.getByRole('button', { name: 'Tải report JSON' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('suppresses the report action for a terminal batch without stored report evidence', () => {
    mocks.batches = [batch({ reportAvailable: false })];
    renderPage();
    expect(screen.queryByRole('button', { name: 'Xem report' })).not.toBeInTheDocument();
  });
});
