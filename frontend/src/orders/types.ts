export interface OrderItemProduct {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  currency: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  priceAtOrder: number;
  product: OrderItemProduct;
}

export interface Order {
  id: string;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
}
