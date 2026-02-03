import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAdmin } from "../../admin/AdminContext";
import "../../pages/Login.css";

export function AdminLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, adminUser } = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError(t("store.auth.emailPasswordRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/admin", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("store.auth.loginError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (adminUser) {
    navigate("/admin", { replace: true });
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <h1 className="auth-page__title">{t("admin.login.title")}</h1>
        <form className="auth-page__form" onSubmit={handleSubmit}>
          <div className="auth-page__field">
            <label className="auth-page__label" htmlFor="admin-email">{t("admin.login.email")}</label>
            <input
              id="admin-email"
              type="email"
              className="auth-page__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="auth-page__field">
            <label className="auth-page__label" htmlFor="admin-password">{t("admin.login.password")}</label>
            <input
              id="admin-password"
              type="password"
              className="auth-page__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="auth-page__error" role="alert">{error}</p>}
          <button type="submit" className="auth-page__submit" disabled={submitting}>
            {submitting ? t("store.auth.processing") : t("admin.login.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
