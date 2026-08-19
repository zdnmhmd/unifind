import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authService, type RegisterResult } from "@/services/authService";
import { isUnauthorized } from "@/services/api";
import type { User } from "@/types";

type AuthValue = {
  user: User | null;
  /** True until the first /api/auth/me call settles, so guards don't flash. */
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  /**
   * Creates the account and starts email confirmation. It does NOT sign anybody
   * in — `user` stays null until the code is confirmed on /verify.
   */
  register: (payload: {
    name: string;
    email: string;
    password: string;
    department?: string;
  }) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Ask the server who we are on first load. The session lives in an httpOnly
  // cookie, so this call is the only way the app can find out.
  const refresh = useCallback(async () => {
    try {
      setUser(await authService.me());
    } catch (error) {
      if (!isUnauthorized(error)) console.error("[UniFind] session check failed", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const signedIn = await authService.login({ email, password });
    setUser(signedIn);
    return signedIn;
  }, []);

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; department?: string }) => {
      // Deliberately no setUser: the backend issues no session here, so claiming
      // one locally would only produce a signed-in UI over 401s from the API.
      return authService.register(payload);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      // Clear locally even if the request failed — the user asked to sign out.
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, loading, isAdmin: user?.role === "admin", login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
