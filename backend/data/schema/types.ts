/**
 * Data shape for Retail Store (plush toys shop).
 * Categories: character | food | animal
 */

export type CategorySlug = "character" | "food" | "animal";

export interface Category {
  id: string;
  slug: CategorySlug;
  name: string;
  description?: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description?: string;
  categoryId: string;
  price: number;        // in smallest unit, e.g. cents or VND
  currency: string;     // e.g. "VND" | "USD"
  imageUrl: string;     // full URL to image (e.g. app origin in dev, CDN in prod)
  stock: number;
  createdAt: string;    // ISO 8601
  updatedAt: string;
}

/** API list response shape */
export interface ProductListResponse {
  products: Product[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface CategoryListResponse {
  categories: Category[];
}
