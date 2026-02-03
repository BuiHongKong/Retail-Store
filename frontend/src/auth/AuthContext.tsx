import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setLocale } from "../i18n/i18n";
import { checkAuthStatus, getMe, getStoredToken, login as apiLogin, logout as apiLogout, register as apiRegister } from "./api";
import type { User } from "./types";

function applyUserLocale(user: User | null): void {
  if (user?.preferredLocale === "vi" || user?.preferredLocale === "en") {
    setLocale(user.preferredLocale);
  }
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** Khi true: auth service đang chạy, phải đăng nhập mới vào shop */
  authRequired: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await checkAuthStatus();
        if (cancelled) return;
        setAuthRequired(status.enabled === true);
        if (status.enabled && getStoredToken()) {
          try {
            const u = await getMe();
            if (!cancelled) {
              setUser(u);
              applyUserLocale(u);
            }
          } catch {
            if (!cancelled) setUser(null);
          }
        } else if (!status.enabled) {
          setUser(null);
        }
      } catch {
        if (!cancelled) setAuthRequired(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadUser = useCallback(async () => {
    if (!authRequired) return;
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const u = await getMe();
      setUser(u);
      applyUserLocale(u);
    } catch {
      setUser(null);
    }
  }, [authRequired]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: u } = await apiLogin(email, password);
    setUser(u);
    applyUserLocale(u);
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const { user: u } = await apiRegister(email, password, name);
    setUser(u);
    applyUserLocale(u);
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const getToken = useCallback(() => getStoredToken(), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user != null,
      authRequired,
      login,
      register,
      logout,
      getToken,
    }),
    [user, loading, authRequired, login, register, logout, getToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
