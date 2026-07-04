import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GoogleSignInButton } from './GoogleSignInButton';

describe('GoogleSignInButton', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    delete window.google;
    document.querySelectorAll('script[data-ticketbox-google-signin]').forEach((element) => element.remove());
  });

  it('reports unavailable when the client ID is missing', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    const unavailable = vi.fn();
    render(<GoogleSignInButton onCredential={vi.fn()} onUnavailable={unavailable} />);
    await waitFor(() => expect(unavailable).toHaveBeenCalledOnce());
  });

  it('renders GIS and forwards only the credential', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client.apps.googleusercontent.com');
    const onCredential = vi.fn();
    const initialize = vi.fn();
    const renderButton = vi.fn();
    window.google = { accounts: { id: { initialize, renderButton } } };
    render(<GoogleSignInButton onCredential={onCredential} onUnavailable={vi.fn()} />);
    await waitFor(() => expect(initialize).toHaveBeenCalledOnce());
    expect(renderButton).toHaveBeenCalledOnce();
    initialize.mock.calls[0][0].callback({ credential: 'google-id-token' });
    expect(onCredential).toHaveBeenCalledWith('google-id-token');
  });

  it('reports script loading failure', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client.apps.googleusercontent.com');
    const unavailable = vi.fn();
    render(<GoogleSignInButton onCredential={vi.fn()} onUnavailable={unavailable} />);
    const script = document.querySelector<HTMLScriptElement>('script[data-ticketbox-google-signin]');
    expect(script).not.toBeNull();
    fireEvent.error(script!);
    await waitFor(() => expect(unavailable).toHaveBeenCalledOnce());
  });
});
