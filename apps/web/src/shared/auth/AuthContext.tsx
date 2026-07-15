import React, { createContext, useContext, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getToken, setToken, clearToken } from './token-storage';
import { decodeJwt, type JwtPayload } from './jwt-decode';

export type Session = JwtPayload;

interface AuthContextValue {
  session: Session | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function restoreSession(): Session | null {
  return decodeJwt(getToken());
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(restoreSession);
  const queryClient = useQueryClient();

  const login = useCallback((token: string) => {
    // Drop any cached data from a previous session (e.g. another account's
    // profile) before establishing the new identity.
    queryClient.clear();
    setToken(token);
    setSession(decodeJwt(token));
  }, [queryClient]);

  const logout = useCallback(() => {
    queryClient.clear();
    clearToken();
    setSession(null);
  }, [queryClient]);

  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
