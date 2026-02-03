import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import "./Login.css";

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError(t("store.auth.emailPasswordRequired"));
      return;
    }
    if (password.length < 6) {
      setError(t("store.auth.passwordMinLength"));
      return;
    }
    setSubmitting(true);
    try {
      await register(email.trim(), password, name.trim() || undefined);
      navigate("/", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("store.auth.registerError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthenticated) {
    navigate("/", { replace: true });
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <h1 className="auth-page__title">{t("store.auth.registerTitle")}</h1>
        <form className="auth-page__form" onSubmit={handleSubmit}>
          <div className="auth-page__field">
            <label className="auth-page__label" htmlFor="register-email">{t("store.auth.email")}</label>
            <input
              id="register-email"
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
            <label className="auth-page__label" htmlFor="register-password">
              {t("store.auth.passwordHint")}
            </label>
            <input
              id="register-password"
              type="password"
              className="auth-page__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          <div className="auth-page__field">
            <label className="auth-page__label" htmlFor="register-name">{t("store.auth.nameOptional")}</label>
            <input
              id="register-name"
              type="text"
              className="auth-page__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              autoComplete="name"
            />
          </div>
          {error && <p className="auth-page__error" role="alert">{error}</p>}
          <button type="submit" className="auth-page__submit" disabled={submitting}>
            {submitting ? t("store.auth.processing") : t("store.auth.register")}
          </button>
        </form>
        <p className="auth-page__footer">
          {t("store.auth.hasAccount")} <Link to="/login">{t("store.auth.login")}</Link>
        </p>
      </div>
    </div>
  );
}
