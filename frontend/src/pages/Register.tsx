import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./Login.css";

export function RegisterPage() {
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
      setError("Vui lòng nhập email và mật khẩu.");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    setSubmitting(true);
    try {
      await register(email.trim(), password, name.trim() || undefined);
      navigate("/", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đăng ký thất bại");
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
        <h1 className="auth-page__title">Đăng ký</h1>
        <form className="auth-page__form" onSubmit={handleSubmit}>
          <div className="auth-page__field">
            <label className="auth-page__label" htmlFor="register-email">Email</label>
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
              Mật khẩu (ít nhất 6 ký tự)
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
            <label className="auth-page__label" htmlFor="register-name">Tên (tùy chọn)</label>
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
            {submitting ? "Đang xử lý..." : "Đăng ký"}
          </button>
        </form>
        <p className="auth-page__footer">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
