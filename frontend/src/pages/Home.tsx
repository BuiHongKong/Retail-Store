import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProductCard } from "../components/ProductCard";
import { ProductFilter, type FilterState } from "../components/ProductFilter";
import { fetchProducts } from "../product/api";
import type { Product } from "../product/types";

const DEFAULT_FILTER: FilterState = { categoryIds: [], priceMax: "" };

function getPriceRange(products: Product[]): { min: number; max: number } {
  if (products.length === 0) return { min: 0, max: 300000 };
  const prices = products.map((p) => p.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

function filterProducts(products: Product[], filter: FilterState): Product[] {
  return products.filter((p) => {
    if (filter.categoryIds.length > 0 && !filter.categoryIds.includes(p.categoryId)) return false;
    if (filter.priceMax !== "") {
      const max = Number(filter.priceMax);
      if (!Number.isNaN(max) && p.price > max) return false;
    }
    return true;
  });
}

interface HomePageProps {
  onReadyChange?: (ready: boolean) => void;
}

export function HomePage({ onReadyChange }: HomePageProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((data) => {
        if (!cancelled) {
          setProducts(Array.isArray(data) ? data : []);
          setApiError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([]);
          setApiError(t("store.home.apiError"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          onReadyChange?.(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onReadyChange]);

  useEffect(() => {
    onReadyChange?.(!loading);
  }, [loading, onReadyChange]);

  const filteredProducts = useMemo(() => filterProducts(products, filter), [products, filter]);
  const priceRange = useMemo(() => getPriceRange(products), [products]);
  const productsReady = !loading;

  return (
    <>
      <section className="app__hero" id="top">
        <div className="app__hero-wrap">
          <img
            src="/assets/banner.png"
            alt="Banner"
            className="app__hero-banner"
          />
          <div className="app__hero-overlay">
            <h1 className="app__hero-title">{t("store.home.heroTitle")}</h1>
            <a href="#products" className="app__hero-cta" role="button">
              <span className="app__hero-cta-inner">{t("store.home.heroCta")}</span>
            </a>
          </div>
        </div>
      </section>

      <section className="app__products" id="products">
        <div className="app__content">
          <ProductFilter
            filter={filter}
            onFilterChange={setFilter}
            priceRange={priceRange}
          />
          <div className="app__main">
            <h2 className="app__section-title">{t("store.home.productsTitle")}</h2>
            {loading ? (
              <p className="app__loading">{t("common.loading")}</p>
            ) : apiError ? (
              <p className="app__error">{apiError}</p>
            ) : filteredProducts.length === 0 ? (
              <p className="app__empty">{t("store.home.noProducts")}</p>
            ) : (
              <div className="app__cards">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    slug={product.slug}
                    product={product}
                    productsReady={productsReady}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
