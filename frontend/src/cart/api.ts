import type { CartResponse } from "./types";

const API_BASE = "/api";
const SESSION_HEADER = "x-cart-session";
const STORAGE_KEY = "retail-store-cart-session";

export function getStoredSessionId(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredSessionId(sessionId: string): void {
  localStorage.setItem(STORAGE_KEY, sessionId);
}

function headers(sessionId: string | null): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (sessionId) h[SESSION_HEADER] = sessionId;
  return h;
}

/** GET /api/cart — lấy giỏ (tạo mới nếu chưa có session) */
export async function fetchCart(sessionId: string | null): Promise<CartResponse> {
  const res = await fetch(`${API_BASE}/cart`, { headers: headers(sessionId) });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data: CartResponse = await res.json();
  if (data.sessionId) setStoredSessionId(data.sessionId);
  return data;
}

/** POST /api/cart/items — thêm sản phẩm */
export async function addCartItem(
  sessionId: string | null,
  productId: string,
  quantity = 1
): Promise<CartResponse> {
  const res = await fetch(`${API_BASE}/cart/items`, {
    method: "POST",
    headers: headers(sessionId),
    body: JSON.stringify({ productId, quantity }),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data: CartResponse = await res.json();
  if (data.sessionId) setStoredSessionId(data.sessionId);
  return data;
}

/** PATCH /api/cart/items/:productId — cập nhật số lượng */
export async function updateCartItem(
  sessionId: string,
  productId: string,
  quantity: number
): Promise<CartResponse> {
  const res = await fetch(`${API_BASE}/cart/items/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    headers: headers(sessionId),
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

/** DELETE /api/cart/items — xóa toàn bộ giỏ */
export async function clearCart(sessionId: string | null): Promise<CartResponse> {
  if (!sessionId) throw new Error("Session required");
  const res = await fetch(`${API_BASE}/cart/items`, {
    method: "DELETE",
    headers: headers(sessionId),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data: CartResponse = await res.json();
  return data;
}

/** DELETE /api/cart/items/:productId — xóa khỏi giỏ */
export async function removeCartItem(
  sessionId: string,
  productId: string
): Promise<CartResponse> {
  const res = await fetch(`${API_BASE}/cart/items/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    headers: headers(sessionId),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
