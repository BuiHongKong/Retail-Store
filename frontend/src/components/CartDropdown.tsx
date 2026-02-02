import { Link } from "react-router-dom";
import { useCart } from "../cart/CartContext";
import { CartIcon } from "./CartIcon";
import "./CartDropdown.css";

function formatPrice(price: number, currency: string): string {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  }
  return `${currency} ${price}`;
}

interface CartDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export function CartDropdown({
  isOpen,
  onToggle,
  onClose,
  triggerRef,
  dropdownRef,
}: CartDropdownProps) {
  const { items, loading, totalCount, removeItem, updateQuantity, clearAll } = useCart();

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const currency = items[0]?.currency ?? "VND";

  return (
    <div className="app__cart-wrap" ref={dropdownRef}>
      <button
        type="button"
        className="app__cart-trigger"
        ref={triggerRef}
        onClick={onToggle}
        aria-label="Giỏ hàng"
        aria-expanded={isOpen}
      >
        <CartIcon />
        {totalCount > 0 && (
          <span className="app__cart-badge" aria-hidden>
            {totalCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="app__cart-dropdown" role="dialog" aria-label="Giỏ hàng">
          <div className="app__cart-dropdown-header">
            <span className="app__cart-dropdown-title">Giỏ hàng</span>
            {items.length > 0 && (
              <button
                type="button"
                className="app__cart-clear-all"
                onClick={() => clearAll()}
                aria-label="Xóa toàn bộ giỏ hàng"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="app__cart-dropdown-body">
            {loading ? (
              <p className="app__cart-empty">Đang tải...</p>
            ) : items.length === 0 ? (
              <p className="app__cart-empty">Giỏ trống</p>
            ) : (
              <ul className="app__cart-list">
                {items.map((item) => (
                  <li key={item.productId} className="app__cart-item">
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="app__cart-item-img"
                      width={48}
                      height={48}
                    />
                    <div className="app__cart-item-info">
                      <span className="app__cart-item-name">{item.name}</span>
                      <span className="app__cart-item-price">
                        {formatPrice(item.price, item.currency)} × {item.quantity}
                      </span>
                    </div>
                    <div className="app__cart-item-actions">
                      <button
                        type="button"
                        className="app__cart-item-qty"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label="Giảm số lượng"
                      >
                        −
                      </button>
                      <span className="app__cart-item-qty-value">{item.quantity}</span>
                      <button
                        type="button"
                        className="app__cart-item-qty"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        aria-label="Tăng số lượng"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="app__cart-item-remove"
                        onClick={() => removeItem(item.productId)}
                        aria-label="Xóa khỏi giỏ"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {items.length > 0 && (
            <div className="app__cart-dropdown-footer">
              <div className="app__cart-dropdown-total-row">
                <span className="app__cart-total-label">Tổng:</span>
                <span className="app__cart-total-value">
                  {formatPrice(total, currency)}
                </span>
              </div>
              <Link
                to="/checkout"
                className="app__cart-checkout-link"
                onClick={onClose}
              >
                Thanh toán
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
