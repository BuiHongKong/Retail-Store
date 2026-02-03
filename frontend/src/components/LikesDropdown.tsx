import { useTranslation } from "react-i18next";
import { useLikes } from "../likes/LikesContext";
import type { Product } from "../product/types";
import { HeartIcon } from "./HeartIcon";
import "./LikesDropdown.css";

function formatPrice(price: number, currency: string, locale: string): string {
  if (currency === "VND") {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", {
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
  const { t, i18n } = useTranslation();
  const { items, loading, removeLike, clearAll } = useLikes();
  const hasItems = items.length > 0;
  const locale = i18n.language === "en" ? "en" : "vi";

  return (
    <div className="app__likes-wrap" ref={dropdownRef}>
      <button
        type="button"
        className={`app__likes-trigger ${hasItems ? "app__likes-trigger--active" : ""}`}
        ref={triggerRef}
        onClick={onToggle}
        aria-label={t("store.likes.ariaLikes")}
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
        <div className="app__likes-dropdown" role="dialog" aria-label={t("store.likes.ariaLikes")}>
          <div className="app__likes-dropdown-header">
            <span className="app__likes-dropdown-title">{t("store.likes.title")}</span>
            {hasItems && (
              <button
                type="button"
                className="app__likes-clear-all"
                onClick={() => clearAll()}
                aria-label={t("store.likes.clearAll")}
              >
                {t("common.clearAll")}
              </button>
            )}
          </div>
          <div className="app__likes-dropdown-body">
            {loading ? (
              <p className="app__likes-empty">{t("common.loading")}</p>
            ) : items.length === 0 ? (
              <p className="app__likes-empty">{t("store.likes.empty")}</p>
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
                        {formatPrice(item.price, item.currency, locale)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="app__likes-item-remove"
                      onClick={() => removeLike(item.id)}
                      aria-label={t("store.likes.removeLike")}
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
