import React, { createContext, useContext, useState, useCallback } from 'react';
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

  const login = useCallback((token: string) => {
    setToken(token);
    setSession(decodeJwt(token));
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setSession(null);
  }, []);

  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
