"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthSession, type AuthRole } from "@/lib/session";

export type AuthSessionState = {
  loggedIn: boolean;
  role: AuthRole | null;
  token: string | null;
  email: string | null;
};

export function useAuthSession(): AuthSessionState {
  const read = useCallback((): AuthSessionState => {
    const session = getAuthSession();
    return {
      loggedIn: session.loggedIn,
      role: session.role,
      token: session.token,
      email: session.email
    };
  }, []);

  const [session, setSession] = useState<AuthSessionState>(read);

  useEffect(() => {
    setSession(read());
    const sync = () => setSession(read());
    window.addEventListener("storage", sync);
    window.addEventListener("internai-auth-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("internai-auth-change", sync);
    };
  }, [read]);

  return session;
}
