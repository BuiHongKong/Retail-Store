import type { LikesResponse } from "./types";
import type { Product } from "../product/types";

const API_BASE = "/api";
const SESSION_HEADER = "x-likes-session";
const STORAGE_KEY = "retail-store-likes-session";

export function getStoredLikesSessionId(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredLikesSessionId(sessionId: string): void {
  localStorage.setItem(STORAGE_KEY, sessionId);
}

function headers(sessionId: string | null): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (sessionId) h[SESSION_HEADER] = sessionId;
  return h;
}

/** GET /api/likes — danh sách đã thích (không header thì trả sessionId mới + items rỗng) */
export async function fetchLikes(sessionId: string | null): Promise<LikesResponse> {
  const res = await fetch(`${API_BASE}/likes`, { headers: headers(sessionId) });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data: LikesResponse = await res.json();
  if (data.sessionId) setStoredLikesSessionId(data.sessionId);
  return data;
}

/** POST /api/likes/items — thêm like */
export async function addLike(
  sessionId: string | null,
  productId: string
): Promise<LikesResponse> {
  const res = await fetch(`${API_BASE}/likes/items`, {
    method: "POST",
    headers: headers(sessionId),
    body: JSON.stringify({ productId }),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data: LikesResponse = await res.json();
  if (data.sessionId) setStoredLikesSessionId(data.sessionId);
  return data;
}

/** DELETE /api/likes/items — xóa toàn bộ like */
export async function clearLikes(sessionId: string | null): Promise<LikesResponse> {
  if (!sessionId) throw new Error("Session required");
  const res = await fetch(`${API_BASE}/likes/items`, {
    method: "DELETE",
    headers: headers(sessionId),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data: LikesResponse = await res.json();
  return data;
}

/** DELETE /api/likes/items/:productId — bỏ like */
export async function removeLike(
  sessionId: string,
  productId: string
): Promise<LikesResponse> {
  const res = await fetch(`${API_BASE}/likes/items/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    headers: headers(sessionId),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
