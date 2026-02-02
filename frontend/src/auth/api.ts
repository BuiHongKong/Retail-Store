import type { User, AuthResponse } from "./types";

const API_BASE = "/api";
const TOKEN_KEY = "retail-store-token";

/** GET /api/auth/status — kiểm tra auth service có đang chạy không (bật thì bắt buộc đăng nhập). Ném lỗi khi service không chạy. */
export async function checkAuthStatus(): Promise<{ enabled: boolean }> {
  const res = await fetch(`${API_BASE}/auth/status`);
  if (!res.ok) throw new Error("Auth service unavailable");
  const data = await res.json();
  return data;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = getStoredToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export async function register(
  email: string,
  password: string,
  name?: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: name ?? undefined }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Registration failed");
  setStoredToken(data.token);
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  setStoredToken(data.token);
  return data;
}

export async function getMe(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
  if (res.status === 401) {
    clearStoredToken();
    throw new Error("Unauthorized");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to get user");
  return data;
}

export function logout(): void {
  clearStoredToken();
}
