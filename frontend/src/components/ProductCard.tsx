import { useCallback, useEffect, useState } from "react";
import { useCart } from "../cart/CartContext";
import { useLikes } from "../likes/LikesContext";
import { fetchProductBySlug } from "../product/api";
import type { Product } from "../product/types";
import { HeartIcon } from "./HeartIcon";
import "./ProductCard.css";

interface ProductCardProps {
  slug: string;
  product?: Product;
  /** Chỉ cho phép thêm giỏ / like sau khi danh sách product đã load */
  productsReady?: boolean;
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

export function ProductCard({ slug, product: productProp, productsReady = true }: ProductCardProps) {
  const [product, setProduct] = useState<Product | null>(productProp ?? null);
  const [loading, setLoading] = useState(!productProp);
  const [error, setError] = useState<string | null>(null);

  const displayProduct = productProp ?? product;
  const { addItem } = useCart();
  const { isLiked, addLike, removeLike } = useLikes();
  const liked = displayProduct ? isLiked(displayProduct.id) : false;

  const toggleLiked = useCallback(() => {
    const p = productProp ?? product;
    if (!p) return;
    if (liked) removeLike(p.id);
    else addLike(p.id);
  }, [productProp, product, liked, addLike, removeLike]);

  useEffect(() => {
    if (productProp) return;
    let cancelled = false;
    const ctrl = new AbortController();
    fetchProductBySlug(slug, ctrl.signal)
      .then((data) => {
        if (!cancelled) setProduct(data);
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
          disabled={!productsReady}
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
        <button
          type="button"
          className="product-card__add-cart"
          onClick={() => addItem(displayProduct.id)}
          disabled={!productsReady}
        >
          Thêm vào giỏ
        </button>
      </div>
    </article>
  );
}
