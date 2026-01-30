/** Product shape từ API (backend/data/schema/types.ts) */
export interface Product {
  id: string;
  slug: string;
  name: string;
  description?: string;
  categoryId: string;
  price: number;
  currency: string;
  imageUrl: string;
  rating: number;
  ratingCount: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}
