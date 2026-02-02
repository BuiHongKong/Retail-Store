import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../cart/CartContext";
import { fetchCheckoutPreview, submitCheckout } from "../checkout/api";
import type { CheckoutPreviewResponse } from "../checkout/types";
import type { CheckoutPayload } from "../checkout/types";
import "./Checkout.css";

function formatPrice(price: number, currency: string): string {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  }
  return `${currency} ${price}`;
}

export function CheckoutPage() {
  const { refreshCart } = useCart();
  const [preview, setPreview] = useState<CheckoutPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<"card" | "cod">("cod");
  const [shippingAddress, setShippingAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchCheckoutPreview()
      .then((data) => {
        if (!cancelled) {
          setPreview(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Lỗi tải giỏ hàng");
          setPreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!preview || preview.items.length === 0) {
      setSubmitError("Giỏ hàng trống.");
      return;
    }
    if (paymentMethod === "card" && !cardHolder.trim()) {
      setSubmitError("Vui lòng nhập tên chủ thẻ.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: CheckoutPayload = {
        paymentMethod,
        shippingAddress: shippingAddress.trim() || undefined,
        phone: phone.trim() || undefined,
      };
      if (paymentMethod === "card") {
        payload.cardHolder = cardHolder.trim();
        if (cardNumber.trim()) payload.cardNumber = cardNumber.trim();
        if (expiry.trim()) payload.expiry = expiry.trim();
        if (cvc.trim()) payload.cvc = cvc.trim();
      }
      const res = await submitCheckout(payload);
      setOrderId(res.orderId);
      await refreshCart();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Lỗi thanh toán");
    } finally {
      setSubmitting(false);
    }
  };

  if (orderId) {
    return (
      <div className="checkout checkout--success">
        <div className="checkout__success-card">
          <h2 className="checkout__success-title">Đặt hàng thành công</h2>
          <p className="checkout__success-message">
            Đơn hàng của bạn đã được tạo (thanh toán giả lập). Mã đơn: <strong>{orderId}</strong>
          </p>
          <Link to="/" className="checkout__success-link">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="checkout">
        <p className="checkout__loading">Đang tải...</p>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="checkout">
        <p className="checkout__error">{error ?? "Không có dữ liệu"}</p>
        <Link to="/">Về trang chủ</Link>
      </div>
    );
  }

  if (preview.items.length === 0) {
    return (
      <div className="checkout">
        <p className="checkout__empty">Giỏ hàng trống. Thêm sản phẩm trước khi thanh toán.</p>
        <Link to="/">Về trang chủ</Link>
      </div>
    );
  }

  const total = preview.total;
  const currency = preview.currency;

  return (
    <div className="checkout">
      <div className="checkout__content">
        <h1 className="checkout__title">Thanh toán</h1>

        <section className="checkout__preview">
          <h2 className="checkout__section-title">Đơn hàng</h2>
          <ul className="checkout__list">
            {preview.items.map((item) => (
              <li key={item.productId} className="checkout__item">
                <img
                  src={item.imageUrl}
                  alt=""
                  className="checkout__item-img"
                  width={56}
                  height={56}
                />
                <div className="checkout__item-info">
                  <span className="checkout__item-name">{item.name}</span>
                  <span className="checkout__item-meta">
                    {formatPrice(item.price, item.currency)} × {item.quantity}
                  </span>
                </div>
                <span className="checkout__item-total">
                  {formatPrice(item.price * item.quantity, item.currency)}
                </span>
              </li>
            ))}
          </ul>
          <div className="checkout__preview-total">
            <span>Tổng cộng:</span>
            <strong>{formatPrice(total, currency)}</strong>
          </div>
        </section>

        <form className="checkout__form" onSubmit={handleSubmit}>
          <h2 className="checkout__section-title">Thông tin thanh toán (giả lập)</h2>

          <div className="checkout__field">
            <label className="checkout__label">Phương thức thanh toán</label>
            <div className="checkout__radios">
              <label className="checkout__radio">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                />
                <span>Thanh toán khi nhận hàng (COD)</span>
              </label>
              <label className="checkout__radio">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === "card"}
                  onChange={() => setPaymentMethod("card")}
                />
                <span>Thẻ (giả lập)</span>
              </label>
            </div>
          </div>

          <div className="checkout__field">
            <label className="checkout__label" htmlFor="shippingAddress">
              Địa chỉ giao hàng
            </label>
            <textarea
              id="shippingAddress"
              className="checkout__input checkout__textarea"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              rows={2}
              placeholder="Số nhà, đường, phường/xã, quận/huyện..."
            />
          </div>

          <div className="checkout__field">
            <label className="checkout__label" htmlFor="phone">
              Số điện thoại
            </label>
            <input
              id="phone"
              type="tel"
              className="checkout__input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912345678"
            />
          </div>

          {paymentMethod === "card" && (
            <>
              <div className="checkout__field">
                <label className="checkout__label" htmlFor="cardHolder">
                  Tên chủ thẻ <span className="checkout__required">*</span>
                </label>
                <input
                  id="cardHolder"
                  type="text"
                  className="checkout__input"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="NGUYEN VAN A"
                  required
                />
              </div>
              <div className="checkout__field">
                <label className="checkout__label" htmlFor="cardNumber">
                  Số thẻ (giả lập)
                </label>
                <input
                  id="cardNumber"
                  type="text"
                  className="checkout__input"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4111 1111 1111 1111"
                />
              </div>
              <div className="checkout__row">
                <div className="checkout__field">
                  <label className="checkout__label" htmlFor="expiry">
                    Ngày hết hạn
                  </label>
                  <input
                    id="expiry"
                    type="text"
                    className="checkout__input"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                  />
                </div>
                <div className="checkout__field">
                  <label className="checkout__label" htmlFor="cvc">
                    CVC
                  </label>
                  <input
                    id="cvc"
                    type="text"
                    className="checkout__input"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    placeholder="123"
                  />
                </div>
              </div>
            </>
          )}

          {submitError && (
            <p className="checkout__submit-error" role="alert">
              {submitError}
            </p>
          )}

          <div className="checkout__actions">
            <Link to="/" className="checkout__back">
              Quay lại
            </Link>
            <button
              type="submit"
              className="checkout__submit"
              disabled={submitting}
            >
              {submitting ? "Đang xử lý..." : "Đặt hàng (giả lập)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
