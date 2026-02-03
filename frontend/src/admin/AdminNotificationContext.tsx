import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./AdminNotification.css";

export type ToastType = "error" | "success" | "info";

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

interface ConfirmState {
  message: string;
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

interface AdminNotificationContextValue {
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (message: string, onConfirm: () => void, onCancel?: () => void) => void;
}

const AdminNotificationContext = createContext<AdminNotificationContextValue | null>(null);

const TOAST_DURATION_MS = 4000;

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ message: "", type: "info", visible: false });
  const [confirm, setConfirm] = useState<ConfirmState>({
    message: "",
    visible: false,
    onConfirm: () => {},
    onCancel: () => {},
  });
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type, visible: true });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      toastTimeoutRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  const showConfirm = useCallback(
    (message: string, onConfirm: () => void, onCancel?: () => void) => {
      setConfirm({
        message,
        visible: true,
        onConfirm: () => {
          onConfirm();
          setConfirm((c) => ({ ...c, visible: false }));
        },
        onCancel: () => {
          onCancel?.();
          setConfirm((c) => ({ ...c, visible: false }));
        },
      });
    },
    []
  );

  const closeToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const value: AdminNotificationContextValue = { showToast, showConfirm };

  return (
    <AdminNotificationContext.Provider value={value}>
      {children}
      {toast.visible && (
        <div
          className={`admin-notif admin-notif--toast admin-notif--${toast.type}`}
          role="alert"
        >
          <span className="admin-notif__message">{toast.message}</span>
          <button
            type="button"
            className="admin-notif__close"
            onClick={closeToast}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
      )}
      {confirm.visible && (
        <div className="admin-notif admin-notif--confirm-overlay" role="dialog" aria-modal="true">
          <div className="admin-notif__confirm">
            <p className="admin-notif__confirm-message">{confirm.message}</p>
            <div className="admin-notif__confirm-actions">
              <button
                type="button"
                className="admin-notif__btn admin-notif__btn--secondary"
                onClick={confirm.onCancel}
              >
                Hủy
              </button>
              <button
                type="button"
                className="admin-notif__btn admin-notif__btn--primary"
                onClick={confirm.onConfirm}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminNotificationContext.Provider>
  );
}

export function useAdminNotification() {
  const ctx = useContext(AdminNotificationContext);
  if (!ctx) {
    throw new Error("useAdminNotification must be used within AdminNotificationProvider");
  }
  return ctx;
}
