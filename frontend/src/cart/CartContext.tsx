import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addCartItem as apiAdd,
  clearCart as apiClearCart,
  fetchCart,
  getStoredSessionId,
  removeCartItem as apiRemove,
  updateCartItem as apiUpdate,
} from "./api";
import type { CartItem } from "./types";

interface CartContextValue {
  items: CartItem[];
  sessionId: string | null;
  loading: boolean;
  error: string | null;
  refreshCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearAll: () => Promise<void>;
  totalCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(() => getStoredSessionId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sid = getStoredSessionId();
      const data = await fetchCart(sid);
      setSessionId(data.sessionId);
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải giỏ hàng");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = useCallback(
    async (productId: string, quantity = 1) => {
      const sid = getStoredSessionId();
      try {
        const data = await apiAdd(sid, productId, quantity);
        setSessionId(data.sessionId);
        setItems(data.items);
      } catch (e) {
        console.error(e);
      }
    },
    []
  );

  const removeItem = useCallback(async (productId: string) => {
    const sid = getStoredSessionId();
    if (!sid) return;
    try {
      const data = await apiRemove(sid, productId);
      setItems(data.items);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    const sid = getStoredSessionId();
    if (!sid) return;
    try {
      const data = await apiUpdate(sid, productId, quantity);
      setItems(data.items);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const clearAll = useCallback(async () => {
    const sid = getStoredSessionId();
    if (!sid) return;
    try {
      const data = await apiClearCart(sid);
      setItems(data.items);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const totalCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      sessionId,
      loading,
      error,
      refreshCart,
      addItem,
      removeItem,
      updateQuantity,
      clearAll,
      totalCount,
    }),
    [items, sessionId, loading, error, refreshCart, addItem, removeItem, updateQuantity, clearAll, totalCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
