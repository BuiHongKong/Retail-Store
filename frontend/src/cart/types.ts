/** Item trong giỏ — shape từ API /api/cart */
export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string;
  quantity: number;
}

/** Response GET /api/cart */
export interface CartResponse {
  sessionId: string;
  items: CartItem[];
}
