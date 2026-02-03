import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAdmin } from "../../admin/AdminContext";
import { AdminNotificationProvider } from "../../admin/AdminNotificationContext";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import "./AdminLayout.css";

export function AdminLayout() {
  const { t } = useTranslation();
  const { loading, adminEnabled, adminUser, logout } = useAdmin();
  const location = useLocation();
  const isLogin = location.pathname === "/admin/login";

  if (loading) {
    return (
      <div className="admin-layout">
        <p className="admin-layout__loading">{t("admin.layout.loading")}</p>
      </div>
    );
  }

  if (!adminEnabled) {
    return (
      <div className="admin-layout">
        <div className="admin-layout__unavailable">
          <h1>{t("admin.layout.unavailableTitle")}</h1>
          <p>{t("admin.layout.unavailableMessage")}</p>
          <Link to="/">{t("common.homeLink")}</Link>
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
    <AdminNotificationProvider>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <h2 className="admin-sidebar__title">{t("admin.layout.sidebarTitle")}</h2>
          <nav className="admin-sidebar__nav">
            <Link
              to="/admin"
              className={location.pathname === "/admin" ? "admin-sidebar__link admin-sidebar__link--active" : "admin-sidebar__link"}
            >
              {t("admin.layout.orders")}
            </Link>
            <Link
              to="/admin/products"
              className={location.pathname.startsWith("/admin/products") ? "admin-sidebar__link admin-sidebar__link--active" : "admin-sidebar__link"}
            >
              {t("admin.layout.products")}
            </Link>
            <Link
              to="/admin/categories"
              className={location.pathname.startsWith("/admin/categories") ? "admin-sidebar__link admin-sidebar__link--active" : "admin-sidebar__link"}
            >
              {t("admin.layout.categories")}
            </Link>
          </nav>
          <div className="admin-sidebar__user">
            <LanguageSwitcher />
            <span>{adminUser?.email}</span>
            <button type="button" className="admin-sidebar__logout" onClick={() => logout()}>
              {t("admin.layout.logout")}
            </button>
          </div>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </AdminNotificationProvider>
  );
}
