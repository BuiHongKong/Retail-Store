import { useEffect, useMemo, useRef, useState } from "react";
import { CartDropdown } from "./components/CartDropdown";
import { LikesDropdown } from "./components/LikesDropdown";
import { ProductCard } from "./components/ProductCard";
import { ProductFilter, type FilterState } from "./components/ProductFilter";
import { CartProvider } from "./cart/CartContext";
import { LikesProvider } from "./likes/LikesContext";
import { ProductsReadyContext } from "./ProductsReadyContext";
import { fetchProducts } from "./product/api";
import type { Product } from "./product/types";
import "./App.css";

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

  const [cartOpen, setCartOpen] = useState(false);
  const cartTriggerRef = useRef<HTMLButtonElement>(null);
  const cartDropdownRef = useRef<HTMLDivElement>(null);
  const [likesOpen, setLikesOpen] = useState(false);
  const likesTriggerRef = useRef<HTMLButtonElement>(null);
  const likesDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cartOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        cartTriggerRef.current?.contains(target) ||
        cartDropdownRef.current?.contains(target)
      )
        return;
      setCartOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [cartOpen]);

  useEffect(() => {
    if (!likesOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        likesTriggerRef.current?.contains(target) ||
        likesDropdownRef.current?.contains(target)
      )
        return;
      setLikesOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [likesOpen]);

  const productsReady = !loading;

  return (
    <ProductsReadyContext.Provider value={productsReady}>
      <CartProvider>
        <LikesProvider>
          <main className="app">
            <header className="app__header">
              <span className="app__logo">Retail Store</span>
              <div className="app__header-actions">
                <LikesDropdown
                  isOpen={likesOpen}
                  onToggle={() => setLikesOpen((prev) => !prev)}
                  onClose={() => setLikesOpen(false)}
                  triggerRef={likesTriggerRef}
                  dropdownRef={likesDropdownRef}
                />
                <CartDropdown
                  isOpen={cartOpen}
                  onToggle={() => setCartOpen((prev) => !prev)}
                  onClose={() => setCartOpen(false)}
                  triggerRef={cartTriggerRef}
                  dropdownRef={cartDropdownRef}
                />
              </div>
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
                    <span className="app__hero-cta-inner">Vô coi cho vui</span>
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
          </main>
        </LikesProvider>
      </CartProvider>
    </ProductsReadyContext.Provider>
  );
}

export default App;
