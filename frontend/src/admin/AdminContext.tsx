import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  checkAdminStatus,
  clearAdminToken,
  getAdminToken,
  type AdminUser,
} from "./api";

interface AdminContextValue {
  adminUser: AdminUser | null;
  loading: boolean;
  adminEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminEnabled, setAdminEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkAdminStatus()
      .then((status) => {
        if (cancelled) return;
        setAdminEnabled(status.enabled === true);
        if (status.enabled && getAdminToken()) {
          setAdminUser({ id: "", email: "admin", name: "Admin" });
        } else {
          setAdminUser(null);
        }
      })
      .catch(() => {
        if (!cancelled) setAdminEnabled(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { adminLogin } = await import("./api");
    const { user } = await adminLogin(email, password);
    setAdminUser(user);
  }, []);

  const logout = useCallback(() => {
    clearAdminToken();
    setAdminUser(null);
  }, []);

  const getToken = useCallback(() => getAdminToken(), []);

  const value = useMemo<AdminContextValue>(
    () => ({
      adminUser,
      loading,
      adminEnabled,
      login,
      logout,
      getToken,
    }),
    [adminUser, loading, adminEnabled, login, logout, getToken]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
