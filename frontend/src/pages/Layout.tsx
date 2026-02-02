import { useEffect, useRef, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { CartDropdown } from "../components/CartDropdown";
import { LikesDropdown } from "../components/LikesDropdown";

export function Layout() {
  const location = useLocation();
  const { user, loading: authLoading, authRequired, logout } = useAuth();
  const isLoginOrRegister = location.pathname === "/login" || location.pathname === "/register";
  if (!authLoading && authRequired && !user && !isLoginOrRegister) {
    return <Navigate to="/login" replace />;
  }
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

  return (
    <main className="app">
      <header className="app__header">
        <Link to="/" className="app__logo">
          Plush Haven
        </Link>
        <div className="app__header-actions">
          {!authLoading && authRequired && (
            <>
              {user ? (
                <span className="app__header-user">
                  <span
                    className="app__header-avatar"
                    title={user.name || user.email}
                    aria-hidden
                  >
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </span>
                  <Link to="/orders" className="app__header-user-link">Lịch sử đơn hàng</Link>
                  <button type="button" className="app__header-logout" onClick={() => logout()}>
                    Đăng xuất
                  </button>
                </span>
              ) : (
                <span className="app__header-auth">
                  <Link to="/login" className="app__header-auth-link">Đăng nhập</Link>
                  <Link to="/register" className="app__header-auth-link">Đăng ký</Link>
                </span>
              )}
            </>
          )}
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
      <Outlet />
    </main>
  );
}
