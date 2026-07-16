import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { login as loginRequest, type LoginResponse } from './authApi';

interface AuthState {
  token: string | null;
  roles: string[];
  username: string | null;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
}

const STORAGE_KEY = 'ksp-auth';
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredAuth(): AuthState {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return { token: null, roles: [], username: null };
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return { token: null, roles: [], username: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(readStoredAuth);

  const login = useCallback(async (username: string, password: string) => {
    const response = await loginRequest(username, password);
    const next: AuthState = { token: response.token, roles: response.roles, username };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setState(next);
    return response;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setState({ token: null, roles: [], username: null });
  }, []);

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
