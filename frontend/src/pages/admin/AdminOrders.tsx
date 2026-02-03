import { useEffect, useState } from "react";
import {
  getAdminOrders,
  updateOrderStatus,
  type AdminOrder,
} from "../../admin/api";
import { useAdminNotification } from "../../admin/AdminNotificationContext";
import "./AdminOrders.css";

const STATUS_OPTIONS = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "shipping", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

function formatPrice(price: number, currency: string): string {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  }
  return `${currency} ${price}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminOrdersPage() {
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
        if (!cancelled) setError(e instanceof Error ? e.message : "Lỗi tải đơn hàng");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStatusChange = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      const result = await updateOrderStatus(orderId, status);
      if ("deleted" in result && result.deleted) {
        setOrders((prev) => prev.filter((o) => o.id !== result.id));
      } else {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? result : o)));
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Cập nhật thất bại", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-orders">
        <p className="admin-orders__loading">Đang tải đơn hàng...</p>
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
      <h1 className="admin-orders__title">Đơn hàng</h1>
      {orders.length === 0 ? (
        <p className="admin-orders__empty">Chưa có đơn hàng nào.</p>
      ) : (
        <div className="admin-orders__table-wrap">
          <table className="admin-orders__table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Ngày</th>
                <th>SĐT</th>
                <th>Địa chỉ giao hàng</th>
                <th>PT thanh toán</th>
                <th>Tổng</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="admin-orders__id">{order.id.slice(0, 8)}…</td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>{order.phone ?? "—"}</td>
                  <td className="admin-orders__address" title={order.shippingAddress ?? undefined}>
                    {order.shippingAddress ? (order.shippingAddress.length > 40 ? `${order.shippingAddress.slice(0, 40)}…` : order.shippingAddress) : "—"}
                  </td>
                  <td>{order.paymentMethod === "card" ? "Thẻ" : order.paymentMethod === "cod" ? "COD" : order.paymentMethod}</td>
                  <td>{formatPrice(order.total, order.currency)}</td>
                  <td>
                    <select
                      className="admin-orders__select"
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      disabled={updatingId === order.id}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
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
