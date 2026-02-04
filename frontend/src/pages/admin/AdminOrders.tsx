import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getAdminOrders,
  updateOrderStatus,
  type AdminOrder,
} from "../../admin/api";
import { useAdminNotification } from "../../admin/AdminNotificationContext";
import "./AdminOrders.css";

const STATUS_VALUES = ["pending", "confirmed", "shipping", "delivered", "completed", "cancelled"] as const;

function formatPrice(price: number, currency: string, locale: string): string {
  if (currency === "VND") {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", { style: "currency", currency: "VND" }).format(price);
  }
  return `${currency} ${price}`;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminOrdersPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en" : "vi";
  const { showToast } = useAdminNotification();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminOrders({ limit: 100 })
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t("admin.orders.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleStatusChange = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      const result = await updateOrderStatus(orderId, status);
      if ("deleted" in result && result.deleted) {
        setOrders((prev) => prev.filter((o) => o.id !== result.id));
      } else {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? (result as AdminOrder) : o)));
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("admin.orders.updateError"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-orders">
        <p className="admin-orders__loading">{t("admin.orders.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-orders">
        <p className="admin-orders__error">{error}</p>
      </div>
    );
  }

  return (
    <div className="admin-orders">
      <h1 className="admin-orders__title">{t("admin.orders.title")}</h1>
      {orders.length === 0 ? (
        <p className="admin-orders__empty">{t("admin.orders.empty")}</p>
      ) : (
        <div className="admin-orders__table-wrap">
          <table className="admin-orders__table">
            <thead>
              <tr>
                <th>{t("admin.orders.id")}</th>
                <th>{t("admin.orders.date")}</th>
                <th>{t("admin.orders.phone")}</th>
                <th>{t("admin.orders.shippingAddress")}</th>
                <th>{t("admin.orders.paymentMethod")}</th>
                <th>{t("admin.orders.total")}</th>
                <th>{t("admin.orders.status")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="admin-orders__id">{order.id.slice(0, 8)}…</td>
                  <td>{formatDate(order.createdAt, locale)}</td>
                  <td>{order.phone ?? "—"}</td>
                  <td className="admin-orders__address" title={order.shippingAddress ?? undefined}>
                    {order.shippingAddress ? (order.shippingAddress.length > 40 ? `${order.shippingAddress.slice(0, 40)}…` : order.shippingAddress) : "—"}
                  </td>
                  <td>{order.paymentMethod === "card" ? t("store.checkout.card") : order.paymentMethod === "cod" ? "COD" : order.paymentMethod}</td>
                  <td>{formatPrice(order.total, order.currency, locale)}</td>
                  <td>
                    <select
                      className="admin-orders__select"
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      disabled={updatingId === order.id}
                    >
                      {STATUS_VALUES.map((value) => (
                        <option key={value} value={value}>
                          {t(`admin.orders.status${value.charAt(0).toUpperCase() + value.slice(1)}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
