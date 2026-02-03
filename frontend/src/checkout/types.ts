/** Item trong preview checkout — shape từ API /api/checkout/preview */
export interface CheckoutPreviewItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string;
  quantity: number;
}

/** Response GET /api/checkout/preview */
export interface CheckoutPreviewResponse {
  sessionId: string;
  items: CheckoutPreviewItem[];
  total: number;
  currency: string;
}

/** Body POST /api/checkout — form thanh toán giả lập */
export interface CheckoutPayload {
  paymentMethod: "card" | "cod";
  shippingAddress?: string;
  phone?: string;
  cardHolder?: string;
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
}

/** Response POST /api/checkout */
export interface CheckoutResponse {
  success: boolean;
  orderId: string;
  message: string;
}
