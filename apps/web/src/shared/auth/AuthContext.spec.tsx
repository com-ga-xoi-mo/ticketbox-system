// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthContext';
import { clearToken } from './token-storage';

function makeToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

const TOKEN_A = makeToken({ sub: 'admin-a', roles: ['ADMIN'] });
const TOKEN_B = makeToken({ sub: 'admin-b', roles: ['ADMIN'] });

function TestConsumer() {
  const { session, login, logout } = useAuth();
  const queryClient = useQueryClient();
  const [cached, setCached] = useState('undefined');

  const refreshCached = () =>
    setCached(JSON.stringify(queryClient.getQueryData(['profile', 'mine'])) ?? 'undefined');

  return (
    <div>
      <span data-testid="sub">{session?.sub ?? 'none'}</span>
      <span data-testid="cached">{cached}</span>
      <button
        onClick={() => {
          queryClient.setQueryData(['profile', 'mine'], { displayName: 'Stale Name' });
          refreshCached();
        }}
      >
        seed-cache
      </button>
      <button
        onClick={() => {
          login(TOKEN_A);
          refreshCached();
        }}
      >
        login-a
      </button>
      <button
        onClick={() => {
          login(TOKEN_B);
          refreshCached();
        }}
      >
        login-b
      </button>
      <button
        onClick={() => {
          logout();
          refreshCached();
        }}
      >
        logout
      </button>
    </div>
  );
}

function renderConsumer() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    clearToken();
  });

  it('clears cached query data on logout so a stale profile cannot leak into the next session', async () => {
    renderConsumer();
    await userEvent.click(screen.getByText('login-a'));
    await userEvent.click(screen.getByText('seed-cache'));
    expect(screen.getByTestId('cached').textContent).toContain('Stale Name');

    await userEvent.click(screen.getByText('logout'));

    expect(screen.getByTestId('sub').textContent).toBe('none');
    expect(screen.getByTestId('cached').textContent).toBe('undefined');
  });

  it('clears cached query data when logging in as a different account without an explicit logout', async () => {
    renderConsumer();
    await userEvent.click(screen.getByText('login-a'));
    await userEvent.click(screen.getByText('seed-cache'));
    expect(screen.getByTestId('cached').textContent).toContain('Stale Name');

    await userEvent.click(screen.getByText('login-b'));

    expect(screen.getByTestId('sub').textContent).toBe('admin-b');
    expect(screen.getByTestId('cached').textContent).toBe('undefined');
  });
});
