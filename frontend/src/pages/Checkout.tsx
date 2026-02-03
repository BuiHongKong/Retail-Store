import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCart } from "../cart/CartContext";
import { fetchCheckoutPreview, submitCheckout } from "../checkout/api";
import type { CheckoutPreviewResponse } from "../checkout/types";
import type { CheckoutPayload } from "../checkout/types";
import "./Checkout.css";

function formatPrice(price: number, currency: string, locale: string): string {
  if (currency === "VND") {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  }
  return `${currency} ${price}`;
}

export function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en" : "vi";
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
          setError(e instanceof Error ? e.message : t("store.checkout.loadCartError"));
          setPreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!preview || preview.items.length === 0) {
      setSubmitError(t("store.checkout.cartEmpty"));
      return;
    }
    if (!shippingAddress.trim()) {
      setSubmitError(t("store.checkout.enterAddress"));
      return;
    }
    if (!phone.trim()) {
      setSubmitError(t("store.checkout.enterPhone"));
      return;
    }
    if (paymentMethod === "card" && !cardHolder.trim()) {
      setSubmitError(t("store.checkout.enterCardHolder"));
      return;
    }
    setSubmitting(true);
    try {
      const payload: CheckoutPayload = {
        paymentMethod,
        shippingAddress: shippingAddress.trim(),
        phone: phone.trim(),
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
      setSubmitError(e instanceof Error ? e.message : t("store.checkout.paymentError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (orderId) {
    return (
      <div className="checkout checkout--success">
        <div className="checkout__success-card">
          <h2 className="checkout__success-title">{t("store.checkout.successTitle")}</h2>
          <p className="checkout__success-message">
            {t("store.checkout.successMessage")} <strong>{orderId}</strong>
          </p>
          <Link to="/" className="checkout__success-link">
            {t("common.homeLink")}
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="checkout">
        <p className="checkout__loading">{t("common.loading")}</p>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="checkout">
        <p className="checkout__error">{error ?? t("common.noData")}</p>
        <Link to="/">{t("common.homeLink")}</Link>
      </div>
    );
  }

  if (preview.items.length === 0) {
    return (
      <div className="checkout">
        <p className="checkout__empty">{t("store.checkout.emptyCartMessage")}</p>
        <Link to="/">{t("common.homeLink")}</Link>
      </div>
    );
  }

  const total = preview.total;
  const currency = preview.currency;

  return (
    <div className="checkout">
      <div className="checkout__content">
        <h1 className="checkout__title">{t("store.checkout.title")}</h1>

        <section className="checkout__preview">
          <h2 className="checkout__section-title">{t("store.checkout.orderTitle")}</h2>
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
                    {formatPrice(item.price, item.currency, locale)} × {item.quantity}
                  </span>
                </div>
                <span className="checkout__item-total">
                  {formatPrice(item.price * item.quantity, item.currency, locale)}
                </span>
              </li>
            ))}
          </ul>
          <div className="checkout__preview-total">
            <span>{t("store.checkout.totalLabel")}</span>
            <strong>{formatPrice(total, currency, locale)}</strong>
          </div>
        </section>

        <form className="checkout__form" onSubmit={handleSubmit}>
          <h2 className="checkout__section-title">{t("store.checkout.paymentTitle")}</h2>

          <div className="checkout__field">
            <label className="checkout__label">{t("store.checkout.paymentMethod")}</label>
            <div className="checkout__radios">
              <label className="checkout__radio">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                />
                <span>{t("store.checkout.cod")}</span>
              </label>
              <label className="checkout__radio">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === "card"}
                  onChange={() => setPaymentMethod("card")}
                />
                <span>{t("store.checkout.card")}</span>
              </label>
            </div>
          </div>

          <div className="checkout__field">
            <label className="checkout__label" htmlFor="shippingAddress">
              {t("store.checkout.shippingAddress")} <span className="checkout__required">{t("store.checkout.required")}</span>
            </label>
            <textarea
              id="shippingAddress"
              className="checkout__input checkout__textarea"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              rows={2}
              placeholder={t("store.checkout.shippingPlaceholder")}
              required
            />
          </div>

          <div className="checkout__field">
            <label className="checkout__label" htmlFor="phone">
              {t("store.checkout.phone")} <span className="checkout__required">{t("store.checkout.required")}</span>
            </label>
            <input
              id="phone"
              type="tel"
              className="checkout__input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("store.checkout.phonePlaceholder")}
              required
            />
          </div>

          {paymentMethod === "card" && (
            <>
              <div className="checkout__field">
                <label className="checkout__label" htmlFor="cardHolder">
                  {t("store.checkout.cardHolder")} <span className="checkout__required">{t("store.checkout.required")}</span>
                </label>
                <input
                  id="cardHolder"
                  type="text"
                  className="checkout__input"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder={t("store.checkout.cardHolderPlaceholder")}
                  required
                />
              </div>
              <div className="checkout__field">
                <label className="checkout__label" htmlFor="cardNumber">
                  {t("store.checkout.cardNumber")}
                </label>
                <input
                  id="cardNumber"
                  type="text"
                  className="checkout__input"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder={t("store.checkout.cardNumberPlaceholder")}
                />
              </div>
              <div className="checkout__row">
                <div className="checkout__field">
                  <label className="checkout__label" htmlFor="expiry">
                    {t("store.checkout.expiry")}
                  </label>
                  <input
                    id="expiry"
                    type="text"
                    className="checkout__input"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder={t("store.checkout.expiryPlaceholder")}
                  />
                </div>
                <div className="checkout__field">
                  <label className="checkout__label" htmlFor="cvc">
                    {t("store.checkout.cvc")}
                  </label>
                  <input
                    id="cvc"
                    type="text"
                    className="checkout__input"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    placeholder={t("store.checkout.cvcPlaceholder")}
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
              {t("common.back")}
            </Link>
            <button
              type="submit"
              className="checkout__submit"
              disabled={submitting}
            >
              {submitting ? t("store.checkout.submitting") : t("store.checkout.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
