import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAdmin } from "../../admin/AdminContext";
import "./AdminLayout.css";

export function AdminLayout() {
  const { loading, adminEnabled, adminUser, logout } = useAdmin();
  const location = useLocation();
  const isLogin = location.pathname === "/admin/login";

  if (loading) {
    return (
      <div className="admin-layout">
        <p className="admin-layout__loading">Đang tải...</p>
      </div>
    );
  }

  if (!adminEnabled) {
    return (
      <div className="admin-layout">
        <div className="admin-layout__unavailable">
          <h1>Admin không khả dụng</h1>
          <p>Admin service chưa chạy. Chạy <code>npm run dev:admin</code> trong thư mục backend.</p>
          <Link to="/">Về trang chủ</Link>
        </div>
      </div>
    );
  }

  if (!adminUser && !isLogin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (isLogin) {
    return <Outlet />;
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar__title">Admin</h2>
        <nav className="admin-sidebar__nav">
          <Link
            to="/admin"
            className={location.pathname === "/admin" ? "admin-sidebar__link admin-sidebar__link--active" : "admin-sidebar__link"}
          >
            Đơn hàng
          </Link>
          <Link
            to="/admin/products"
            className={location.pathname.startsWith("/admin/products") ? "admin-sidebar__link admin-sidebar__link--active" : "admin-sidebar__link"}
          >
            Sản phẩm
          </Link>
          <Link
            to="/admin/categories"
            className={location.pathname.startsWith("/admin/categories") ? "admin-sidebar__link admin-sidebar__link--active" : "admin-sidebar__link"}
          >
            Danh mục
          </Link>
        </nav>
        <div className="admin-sidebar__user">
          <span>{adminUser?.email}</span>
          <button type="button" className="admin-sidebar__logout" onClick={() => logout()}>
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
