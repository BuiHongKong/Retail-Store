import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import "./Login.css";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const { login, isAuthenticated, authRequired } = useAuth();
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
      navigate(redirectTo, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("store.auth.loginError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthenticated) {
    navigate(redirectTo, { replace: true });
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <h1 className="auth-page__title">{t("store.auth.loginTitle")}</h1>
        <form className="auth-page__form" onSubmit={handleSubmit}>
          <div className="auth-page__field">
            <label className="auth-page__label" htmlFor="login-email">{t("store.auth.email")}</label>
            <input
              id="login-email"
              type="email"
              className="auth-page__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="auth-page__field">
            <label className="auth-page__label" htmlFor="login-password">{t("store.auth.password")}</label>
            <input
              id="login-password"
              type="password"
              className="auth-page__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("store.auth.password")}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="auth-page__error" role="alert">{error}</p>}
          {authRequired && (
            <p className="auth-page__hint">{t("store.auth.demoHint")}</p>
          )}
          <button type="submit" className="auth-page__submit" disabled={submitting}>
            {submitting ? t("store.auth.processing") : t("store.auth.login")}
          </button>
        </form>
        <p className="auth-page__footer">
          {t("store.auth.noAccount")} <Link to="/register">{t("store.auth.register")}</Link>
        </p>
      </div>
    </div>
  );
}
