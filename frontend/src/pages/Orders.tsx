import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { fetchMyOrders } from "../orders/api";
import type { Order } from "../orders/types";
import "./Orders.css";

function formatPrice(price: number, currency: string, locale: string): string {
  if (currency === "VND") {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
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

const ORDER_STATUS_KEYS: Record<string, string> = {
  pending: "store.orders.statusPending",
  confirmed: "store.orders.statusConfirmed",
  shipping: "store.orders.statusShipping",
  delivered: "store.orders.statusDelivered",
  cancelled: "store.orders.statusCancelled",
  completed: "store.orders.statusCompleted",
};

export function OrdersPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en" : "vi";
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function getOrderStatusLabel(status: string): string {
    const key = (status || "").toLowerCase();
    const tKey = ORDER_STATUS_KEYS[key];
    return tKey ? t(tKey) : (status || "—");
  }

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
          setError(e instanceof Error ? e.message : t("store.orders.loadError"));
          setOrders([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate, t]);

  if (authLoading) {
    return (
      <div className="orders">
        <p className="orders__loading">{t("common.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="orders">
        <p className="orders__loading">{t("store.orders.loadingOrders")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders">
        <p className="orders__error">{error}</p>
        <Link to="/">{t("common.homeLink")}</Link>
      </div>
    );
  }

  return (
    <div className="orders">
      <div className="orders__content">
        <h1 className="orders__title">{t("store.orders.title")}</h1>
        {orders.length === 0 ? (
          <p className="orders__empty">{t("store.orders.emptyLoggedIn")}</p>
        ) : (
          <ul className="orders__list">
            {orders.map((order) => (
              <li key={order.id} className="orders__card">
                <div className="orders__card-header">
                  <div className="orders__card-meta">
                    <span className="orders__card-id">{order.id.slice(0, 8)}…</span>
                    <span className="orders__card-date">{formatDate(order.createdAt, locale)}</span>
                    <span className={`orders__card-status orders__card-status--${(order.status || "pending").toLowerCase()}`}>
                      {getOrderStatusLabel(order.status)}
                    </span>
                  </div>
                  <span className="orders__card-total">
                    {formatPrice(order.total, order.currency, locale)}
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
                            {formatPrice(item.priceAtOrder, item.product.currency, locale)} × {item.quantity}
                          </span>
                        </div>
                        <span className="orders__item-total">
                          {formatPrice(item.priceAtOrder * item.quantity, item.product.currency, locale)}
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
          {t("common.homeLink")}
        </Link>
      </div>
    </div>
  );
}
