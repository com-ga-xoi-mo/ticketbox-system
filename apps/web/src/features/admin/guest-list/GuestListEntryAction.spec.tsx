// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { GuestListEntryAction } from './GuestListEntryAction';

function Location() {
  return <span>{useLocation().pathname}</span>;
}

describe('GuestListEntryAction', () => {
  it('navigates from concert management to the concert-scoped Admin route', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/concerts']}>
        <GuestListEntryAction concertId="concert-1" />
        <Routes>
          <Route path="*" element={<Location />} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Quản lý Guest List' }));
    expect(screen.getByText('/admin/concerts/concert-1/guest-list')).toBeInTheDocument();
  });
});
