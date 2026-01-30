import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "./components/ProductCard";
import { ProductFilter, type FilterState } from "./components/ProductFilter";
import type { Product } from "./types/product";
import "./App.css";

const API_BASE = "/api";
const DEFAULT_FILTER: FilterState = { categoryIds: [], priceMax: "" };

/** Lấy min/max giá từ danh sách sản phẩm — tự cập nhật khi có sản phẩm mới giá cao/thấp hơn */
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

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/products`)
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then((data: Product[]) => {
        if (!cancelled) {
          setProducts(Array.isArray(data) ? data : []);
          setApiError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([]);
          setApiError(
            "Không kết nối được API. Chạy backend trong terminal: cd backend && npm start"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => filterProducts(products, filter), [products, filter]);
  const priceRange = useMemo(() => getPriceRange(products), [products]);

  return (
    <main className="app">
      <header className="app__header">
        <span className="app__logo">Retail Store</span>
      </header>

      <section className="app__hero" id="top">
        <div className="app__hero-wrap">
          <img
            src="/assets/banner.png"
            alt="Banner"
            className="app__hero-banner"
          />
          <div className="app__hero-overlay">
            <h1 className="app__hero-title">Cute vừa đủ, yêu hơi nhiều</h1>
            <a href="#products" className="app__hero-cta" role="button">
              Vô coi cho vui
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
            <h2 className="app__section-title">Sản phẩm</h2>
          {loading ? (
            <p className="app__loading">Đang tải...</p>
          ) : apiError ? (
            <p className="app__error">{apiError}</p>
          ) : filteredProducts.length === 0 ? (
            <p className="app__empty">Không có sản phẩm nào phù hợp.</p>
          ) : (
            <div className="app__cards">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} slug={product.slug} product={product} />
              ))}
            </div>
          )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
