import { getStoredToken } from "../auth/api";
import { getStoredSessionId } from "../cart/api";
import type {
  CheckoutPreviewResponse,
  CheckoutPayload,
  CheckoutResponse,
} from "./types";

const API_BASE = "/api";
const SESSION_HEADER = "x-cart-session";

function headers(withAuth = false): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const sessionId = getStoredSessionId();
  if (sessionId) h[SESSION_HEADER] = sessionId;
  if (withAuth) {
    const token = getStoredToken();
    if (token) h["Authorization"] = `Bearer ${token}`;
  }
  return h;
}

/** GET /api/checkout/preview — xem nhanh giỏ trước khi thanh toán */
export async function fetchCheckoutPreview(): Promise<CheckoutPreviewResponse> {
  const res = await fetch(`${API_BASE}/checkout/preview`, { headers: headers() });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

/** POST /api/checkout — gửi form thanh toán giả lập (gửi token nếu đã login để gắn đơn vào user) */
export async function submitCheckout(
  payload: CheckoutPayload
): Promise<CheckoutResponse> {
  const res = await fetch(`${API_BASE}/checkout`, {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
  return data;
}
