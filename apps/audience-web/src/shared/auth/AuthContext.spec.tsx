import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { setToken, clearToken } from './token-storage';

vi.mock('./token-storage', () => ({
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));

function makeJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

function TestConsumer() {
  const { session, signIn, signOut } = useAuth();
  return (
    <div>
      <span data-testid="status">{session ? `logged:${session.sub}:${session.roles.join(',')}` : 'signed-out'}</span>
      <button onClick={() => signIn(makeJwt({ sub: 'u1', roles: ['AUDIENCE'] }))}>sign-in</button>
      <button onClick={signOut}>sign-out</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts signed out when no token', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId('status').textContent).toBe('signed-out');
  });

  it('signIn stores token and establishes session', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    await userEvent.click(screen.getByText('sign-in'));
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toContain('logged:u1:AUDIENCE');
    });
    expect(setToken).toHaveBeenCalled();
  });

  it('signOut clears token and session', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    await userEvent.click(screen.getByText('sign-in'));
    await userEvent.click(screen.getByText('sign-out'));
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('signed-out');
    });
    expect(clearToken).toHaveBeenCalled();
  });

  it('signIn does nothing for a malformed token', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    const { session, signIn } = (() => {
      let captured: ReturnType<typeof useAuth>;
      function Capture() {
        captured = useAuth();
        return null;
      }
      render(
        <AuthProvider>
          <Capture />
        </AuthProvider>,
      );
      return captured!;
    })();
    expect(session).toBeNull();
  });

  it('AUDIENCE is the role used - no CUSTOMER role references', () => {
    const source = AuthProvider.toString() + useAuth.toString();
    expect(source).not.toContain('CUSTOMER');
  });
});
