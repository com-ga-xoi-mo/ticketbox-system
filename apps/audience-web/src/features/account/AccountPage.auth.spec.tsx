import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountPage } from './AccountPage';

const { useMyProfile } = vi.hoisted(() => ({ useMyProfile: vi.fn() }));
vi.mock('../../shared/api/profile', () => ({ useMyProfile }));
vi.mock('../../shared/auth/AudienceProtectedRoute', () => ({ AudienceProtectedRoute: ({ children }: any) => children }));
vi.mock('./AvatarUploader', () => ({ AvatarUploader: () => <div>Avatar</div> }));
vi.mock('./ProfileEditForm', () => ({ ProfileEditForm: () => <div>Profile form</div> }));
vi.mock('./PasswordChangeForm', () => ({ PasswordChangeForm: () => <div>Password form</div> }));

const profile = {
  id: '11111111-1111-4111-8111-111111111111', email: 'user@example.com', displayName: 'User',
  roles: ['AUDIENCE'], hasPassword: true, authProviders: [], externalAvatarUrl: null,
};

describe('AccountPage authentication capabilities', () => {
  beforeEach(() => useMyProfile.mockReturnValue({ data: profile, isLoading: false, isError: false, refetch: vi.fn() }));

  it('shows password controls for a local-password account', () => {
    render(<MemoryRouter><AccountPage /></MemoryRouter>);
    expect(screen.getByText('Password form')).toBeInTheDocument();
  });

  it('hides password controls for an OAuth-only account', () => {
    useMyProfile.mockReturnValue({ data: { ...profile, hasPassword: false, authProviders: ['GOOGLE'] }, isLoading: false, isError: false, refetch: vi.fn() });
    render(<MemoryRouter><AccountPage /></MemoryRouter>);
    expect(screen.queryByText('Password form')).not.toBeInTheDocument();
    expect(screen.getByText(/đang đăng nhập bằng Google/)).toBeInTheDocument();
  });
});
