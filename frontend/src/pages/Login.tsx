import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./Login.css";

const DEFAULT_USER_HINT = "Tài khoản dùng thử: demo@example.com / demo123";

export function LoginPage() {
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
      setError("Vui lòng nhập email và mật khẩu.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đăng nhập thất bại");
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
        <h1 className="auth-page__title">Đăng nhập</h1>
        <form className="auth-page__form" onSubmit={handleSubmit}>
          <div className="auth-page__field">
            <label className="auth-page__label" htmlFor="login-email">Email</label>
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
            <label className="auth-page__label" htmlFor="login-password">Mật khẩu</label>
            <input
              id="login-password"
              type="password"
              className="auth-page__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mật khẩu"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="auth-page__error" role="alert">{error}</p>}
          {authRequired && (
            <p className="auth-page__hint">{DEFAULT_USER_HINT}</p>
          )}
          <button type="submit" className="auth-page__submit" disabled={submitting}>
            {submitting ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
        <p className="auth-page__footer">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </div>
    </div>
  );
}
