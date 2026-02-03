import { getStoredToken } from "../auth/api";
import type { Order } from "./types";

const API_BASE = "/api";

export async function fetchMyOrders(): Promise<Order[]> {
  const token = getStoredToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}
