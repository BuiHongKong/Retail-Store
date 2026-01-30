import type { Product } from "./types";

const API_BASE = "/api";

/**
 * Lấy danh sách sản phẩm từ API.
 */
export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

/**
 * Lấy một sản phẩm theo slug từ API.
 */
export async function fetchProductBySlug(
  slug: string,
  signal?: AbortSignal
): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${slug}`, { signal });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
