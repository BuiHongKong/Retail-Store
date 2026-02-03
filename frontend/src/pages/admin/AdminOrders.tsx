import { useEffect, useState } from "react";
import {
  getAdminOrders,
  updateOrderStatus,
  type AdminOrder,
} from "../../admin/api";
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
      const updated = await updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Cập nhật thất bại");
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
                <th>Tổng</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="admin-orders__id">{order.id.slice(0, 8)}…</td>
                  <td>{formatDate(order.createdAt)}</td>
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
