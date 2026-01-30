import type { Product } from "../product/types";

/** Response GET /api/likes */
export interface LikesResponse {
  sessionId: string | null;
  items: Product[];
}
