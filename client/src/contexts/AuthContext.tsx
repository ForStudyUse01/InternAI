import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";
import type { AuthSession, AuthUser } from "@/types/common";

const STORAGE_KEY = "internai_auth_session";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (session: AuthSession) => void;
  logout: () => void;
}

function loadSession(): AuthSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const initialSession = loadSession();
  const [user, setUser] = useState<AuthUser | null>(initialSession?.user ?? null);
  const [token, setToken] = useState<string | null>(initialSession?.token ?? null);

  const value = useMemo(
    () => ({
      user,
      token,
      login: (session: AuthSession) => {
        setUser(session.user);
        setToken(session.token);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      },
      logout: () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
