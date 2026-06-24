import { createContext, useContext, useEffect, useState } from 'react';
import { clearToken, getToken, setToken } from './token-storage';
import { decodeJwt, type Role } from './jwt-decode';

export interface Session {
  sub: string;
  roles: Role[];
}

export interface AuthContextValue {
  session: Session | null;
  signIn: (token: string) => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const payload = decodeJwt(getToken());
    if (!payload) {
      clearToken();
      return null;
    }
    return { sub: payload.sub, roles: payload.roles };
  });

  useEffect(() => {
    const payload = decodeJwt(getToken());
    if (!payload) {
      clearToken();
      setSession(null);
    }
  }, []);

  function signIn(token: string) {
    const payload = decodeJwt(token);
    if (!payload) return;
    setToken(token);
    setSession({ sub: payload.sub, roles: payload.roles });
  }

  function signOut() {
    clearToken();
    setSession(null);
  }

  return <AuthContext.Provider value={{ session, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
