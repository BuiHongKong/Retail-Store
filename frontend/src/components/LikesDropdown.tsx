import { useLikes } from "../likes/LikesContext";
import type { Product } from "../product/types";
import { HeartIcon } from "./HeartIcon";
import "./LikesDropdown.css";

function formatPrice(price: number, currency: string): string {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  }
  return `${currency} ${price}`;
}

interface LikesDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export function LikesDropdown({
  isOpen,
  onToggle,
  triggerRef,
  dropdownRef,
}: LikesDropdownProps) {
  const { items, loading, removeLike, clearAll } = useLikes();
  const hasItems = items.length > 0;

  return (
    <div className="app__likes-wrap" ref={dropdownRef}>
      <button
        type="button"
        className={`app__likes-trigger ${hasItems ? "app__likes-trigger--active" : ""}`}
        ref={triggerRef}
        onClick={onToggle}
        aria-label="Sản phẩm đã thích"
        aria-expanded={isOpen}
      >
        <HeartIcon filled={hasItems} />
        {hasItems && (
          <span className="app__likes-badge" aria-hidden>
            {items.length}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="app__likes-dropdown" role="dialog" aria-label="Sản phẩm đã thích">
          <div className="app__likes-dropdown-header">
            <span className="app__likes-dropdown-title">Đã thích</span>
            {hasItems && (
              <button
                type="button"
                className="app__likes-clear-all"
                onClick={() => clearAll()}
                aria-label="Xóa toàn bộ đã thích"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="app__likes-dropdown-body">
            {loading ? (
              <p className="app__likes-empty">Đang tải...</p>
            ) : items.length === 0 ? (
              <p className="app__likes-empty">Chưa có sản phẩm nào</p>
            ) : (
              <ul className="app__likes-list">
                {items.map((item: Product) => (
                  <li key={item.id} className="app__likes-item">
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="app__likes-item-img"
                      width={48}
                      height={48}
                    />
                    <div className="app__likes-item-info">
                      <span className="app__likes-item-name">{item.name}</span>
                      <span className="app__likes-item-price">
                        {formatPrice(item.price, item.currency)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="app__likes-item-remove"
                      onClick={() => removeLike(item.id)}
                      aria-label="Bỏ thích"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
