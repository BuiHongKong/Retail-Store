import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { fetchMyOrders } from "../orders/api";
import type { Order } from "../orders/types";
import "./Orders.css";

function formatPrice(price: number, currency: string): string {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
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

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
  completed: "Hoàn thành",
};

function getOrderStatusLabel(status: string): string {
  const key = (status || "").toLowerCase();
  return ORDER_STATUS_LABELS[key] ?? (status || "—");
}

export function OrdersPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login?redirect=" + encodeURIComponent("/orders"), { replace: true });
      return;
    }
    if (!user) return;
    let cancelled = false;
    fetchMyOrders()
      .then((data) => {
        if (!cancelled) {
          setOrders(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Lỗi tải đơn hàng");
          setOrders([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="orders">
        <p className="orders__loading">Đang tải...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="orders">
        <p className="orders__loading">Đang tải đơn hàng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders">
        <p className="orders__error">{error}</p>
        <Link to="/">Về trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="orders">
      <div className="orders__content">
        <h1 className="orders__title">Lịch sử đơn hàng</h1>
        {orders.length === 0 ? (
          <p className="orders__empty">Bạn chưa có đơn hàng nào (đơn đặt khi đã đăng nhập).</p>
        ) : (
          <ul className="orders__list">
            {orders.map((order) => (
              <li key={order.id} className="orders__card">
                <div className="orders__card-header">
                  <div className="orders__card-meta">
                    <span className="orders__card-id">{order.id.slice(0, 8)}…</span>
                    <span className="orders__card-date">{formatDate(order.createdAt)}</span>
                    <span className={`orders__card-status orders__card-status--${(order.status || "pending").toLowerCase()}`}>
                      {getOrderStatusLabel(order.status)}
                    </span>
                  </div>
                  <span className="orders__card-total">
                    {formatPrice(order.total, order.currency)}
                  </span>
                </div>
                <div className="orders__card-body">
                  <ul className="orders__items">
                    {order.items.map((item) => (
                      <li key={item.id} className="orders__item">
                        <img
                          src={item.product.imageUrl}
                          alt=""
                          className="orders__item-img"
                          width={48}
                          height={48}
                        />
                        <div className="orders__item-info">
                          <span className="orders__item-name">{item.product.name}</span>
                          <span className="orders__item-meta">
                            {formatPrice(item.priceAtOrder, item.product.currency)} × {item.quantity}
                          </span>
                        </div>
                        <span className="orders__item-total">
                          {formatPrice(item.priceAtOrder * item.quantity, item.product.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link to="/" className="orders__back">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
