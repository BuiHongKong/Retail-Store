import { useCallback, useEffect, useState } from "react";
import { fetchProductBySlug } from "../product/api";
import type { Product } from "../product/types";
import { HeartIcon } from "./HeartIcon";
import "./ProductCard.css";

const LIKED_STORAGE_KEY = "retail-store-liked";

function getLikedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKED_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveLikedIds(ids: Set<string>) {
  try {
    localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

interface ProductCardProps {
  slug: string;
  product?: Product;
}

function formatPrice(price: number, currency: string): string {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  }
  return `${currency} ${price}`;
}

export function ProductCard({ slug, product: productProp }: ProductCardProps) {
  const [product, setProduct] = useState<Product | null>(productProp ?? null);
  const [loading, setLoading] = useState(!productProp);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(() => (productProp ? getLikedIds().has(productProp.id) : false));

  const displayProduct = productProp ?? product;

  const toggleLiked = useCallback(() => {
    const p = productProp ?? product;
    if (!p) return;
    const ids = getLikedIds();
    if (ids.has(p.id)) ids.delete(p.id);
    else ids.add(p.id);
    saveLikedIds(ids);
    setLiked(ids.has(p.id));
  }, [productProp, product]);

  useEffect(() => {
    if (productProp) return;
    let cancelled = false;
    const ctrl = new AbortController();
    fetchProductBySlug(slug, ctrl.signal)
      .then((data) => {
        if (!cancelled) {
          setProduct(data);
          setLiked(getLikedIds().has(data.id));
        }
      })
      .catch((err) => {
        if (!cancelled && err?.name !== "AbortError")
          setError(err instanceof Error ? err.message : "Lỗi tải sản phẩm");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [slug, productProp]);

  if (loading) return <div className="product-card product-card--loading">Đang tải...</div>;
  if (error) return <div className="product-card product-card--error">Lỗi: {error}</div>;
  if (!displayProduct) return null;

  return (
    <article className="product-card">
      <div className="product-card__image-wrap">
        <img
          src={displayProduct.imageUrl}
          alt={displayProduct.name}
          className="product-card__image"
        />
        <button
          type="button"
          className={`product-card__like ${liked ? "product-card__like--active" : ""}`}
          onClick={toggleLiked}
          aria-label={liked ? "Bỏ thích" : "Thích"}
          title={liked ? "Bỏ thích" : "Thích"}
        >
          <HeartIcon filled={liked} />
        </button>
      </div>
      <div className="product-card__body">
        <h2 className="product-card__name">{displayProduct.name}</h2>
        {displayProduct.description && (
          <p className="product-card__description">{displayProduct.description}</p>
        )}
        <div className="product-card__rating">
          <span className="product-card__rating-value">{displayProduct.rating.toFixed(1)}</span>
          <span className="product-card__rating-count">({displayProduct.ratingCount} đánh giá)</span>
        </div>
        <p className="product-card__price">{formatPrice(displayProduct.price, displayProduct.currency)}</p>
      </div>
    </article>
  );
}
