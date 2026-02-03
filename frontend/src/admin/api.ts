const API_BASE = "/api";
const ADMIN_TOKEN_KEY = "retail-admin-token";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
}

function adminHeaders(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function checkAdminStatus(): Promise<{ enabled: boolean }> {
  const res = await fetch(`${API_BASE}/admin/status`);
  if (!res.ok) throw new Error("Admin service unavailable");
  const data = await res.json();
  return data;
}

export async function adminLogin(email: string, password: string): Promise<{ token: string; user: AdminUser }> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  setAdminToken(data.token);
  return data;
}

export interface AdminOrderItem {
  id: string;
  productId: string;
  quantity: number;
  priceAtOrder: number;
  product: { id: string; slug: string; name: string; imageUrl: string; currency: string };
}

export interface AdminOrder {
  id: string;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
  items: AdminOrderItem[];
}

export async function getAdminOrders(params?: { limit?: number; offset?: number }): Promise<AdminOrder[]> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await fetch(`${API_BASE}/admin/orders?${q}`, { headers: adminHeaders() });
  if (res.status === 401) {
    clearAdminToken();
    throw new Error("Unauthorized");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch orders");
  return data;
}

export async function updateOrderStatus(orderId: string, status: string): Promise<AdminOrder> {
  const res = await fetch(`${API_BASE}/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update order");
  return data;
}

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const res = await fetch(`${API_BASE}/admin/categories`, { headers: adminHeaders() });
  if (res.status === 401) {
    clearAdminToken();
    throw new Error("Unauthorized");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch categories");
  return data;
}

export async function createCategory(body: {
  slug: string;
  name: string;
  description?: string;
  sortOrder?: number;
}): Promise<AdminCategory> {
  const res = await fetch(`${API_BASE}/admin/categories`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create category");
  return data;
}

export async function updateCategory(
  id: string,
  body: { name?: string; description?: string; sortOrder?: number }
): Promise<AdminCategory> {
  const res = await fetch(`${API_BASE}/admin/categories/${id}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update category");
  return data;
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  categoryId: string;
  category: AdminCategory;
  price: number;
  currency: string;
  imageUrl: string;
  rating: number;
  ratingCount: number;
  stock: number;
}

export async function getAdminProducts(categoryId?: string): Promise<AdminProduct[]> {
  const q = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : "";
  const res = await fetch(`${API_BASE}/admin/products${q}`, { headers: adminHeaders() });
  if (res.status === 401) {
    clearAdminToken();
    throw new Error("Unauthorized");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch products");
  return data;
}

export async function createProduct(body: {
  name: string;
  slug: string;
  description?: string;
  categoryId: string;
  price: number;
  currency: string;
  imageUrl: string;
  rating?: number;
  ratingCount?: number;
  stock?: number;
}): Promise<AdminProduct> {
  const res = await fetch(`${API_BASE}/admin/products`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create product");
  return data;
}

export async function updateProduct(
  id: string,
  body: Partial<{
    name: string;
    slug: string;
    description: string;
    categoryId: string;
    price: number;
    currency: string;
    imageUrl: string;
    rating: number;
    ratingCount: number;
    stock: number;
  }>
): Promise<AdminProduct> {
  const res = await fetch(`${API_BASE}/admin/products/${id}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update product");
  return data;
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const token = getAdminToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/admin/upload`, {
    method: "POST",
    headers,
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data;
}
