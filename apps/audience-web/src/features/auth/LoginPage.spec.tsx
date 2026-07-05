import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../shared/api/client';
import { LoginPage } from './LoginPage';

const { signIn, loginRequest, googleLoginRequest } = vi.hoisted(() => ({
  signIn: vi.fn(),
  loginRequest: vi.fn(),
  googleLoginRequest: vi.fn(),
}));

vi.mock('../../shared/auth/AuthContext', () => ({
  useAuth: () => ({ signIn, signOut: vi.fn(), session: null }),
}));
vi.mock('../../shared/api/auth', () => ({ loginRequest, googleLoginRequest }));
vi.mock('./GoogleSignInButton', () => ({
  GoogleSignInButton: ({ onCredential, disabled }: any) => (
    <button disabled={disabled} onClick={() => onCredential('google-credential')}>
      Tiếp tục với Google
    </button>
  ),
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login?returnTo=/account']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<div>Account destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage Google sign-in', () => {
  beforeEach(() => vi.clearAllMocks());

  it('establishes a TicketBox session and preserves returnTo', async () => {
    googleLoginRequest.mockResolvedValue('ticketbox-jwt');
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục với Google' }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith('ticketbox-jwt'));
    expect(googleLoginRequest).toHaveBeenCalledWith('google-credential');
    expect(await screen.findByText('Account destination')).toBeInTheDocument();
  });

  it('shows account collision guidance and keeps password login available', async () => {
    googleLoginRequest.mockRejectedValue(new ApiError(409, 'ACCOUNT_LINK_REQUIRED'));
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục với Google' }));
    expect(await screen.findByText(/Hãy đăng nhập bằng mật khẩu/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('retains existing email/password login', async () => {
    loginRequest.mockResolvedValue('password-jwt');
    renderLogin();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await waitFor(() => expect(loginRequest).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password',
    }));
    expect(signIn).toHaveBeenCalledWith('password-jwt');
  });
});
