import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../../admin/AdminContext";
import "../../pages/Login.css";

export function AdminLoginPage() {
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
      setError("Vui lòng nhập email và mật khẩu.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/admin", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đăng nhập thất bại");
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
        <h1 className="auth-page__title">Đăng nhập Admin</h1>
        <form className="auth-page__form" onSubmit={handleSubmit}>
          <div className="auth-page__field">
            <label className="auth-page__label" htmlFor="admin-email">Email</label>
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
            <label className="auth-page__label" htmlFor="admin-password">Mật khẩu</label>
            <input
              id="admin-password"
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
          <button type="submit" className="auth-page__submit" disabled={submitting}>
            {submitting ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
