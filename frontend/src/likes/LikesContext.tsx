import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useProductsReady } from "../ProductsReadyContext";
import {
  addLike as apiAddLike,
  clearLikes as apiClearLikes,
  fetchLikes,
  getStoredLikesSessionId,
  removeLike as apiRemoveLike,
} from "./api";
import type { Product } from "../product/types";

interface LikesContextValue {
  items: Product[];
  sessionId: string | null;
  loading: boolean;
  error: string | null;
  refreshLikes: () => Promise<void>;
  addLike: (productId: string) => Promise<void>;
  removeLike: (productId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  isLiked: (productId: string) => boolean;
}

const LikesContext = createContext<LikesContextValue | null>(null);

export function LikesProvider({ children }: { children: ReactNode }) {
  const productsReady = useProductsReady();
  const [items, setItems] = useState<Product[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(() =>
    getStoredLikesSessionId()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLikes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sid = getStoredLikesSessionId();
      const data = await fetchLikes(sid);
      setSessionId(data.sessionId);
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải danh sách thích");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (productsReady) refreshLikes();
  }, [productsReady, refreshLikes]);

  const addLike = useCallback(async (productId: string) => {
    const sid = getStoredLikesSessionId();
    try {
      const data = await apiAddLike(sid, productId);
      setSessionId(data.sessionId);
      setItems(data.items);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const removeLike = useCallback(async (productId: string) => {
    const sid = getStoredLikesSessionId();
    if (!sid) return;
    try {
      const data = await apiRemoveLike(sid, productId);
      setItems(data.items);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const clearAll = useCallback(async () => {
    const sid = getStoredLikesSessionId();
    if (!sid) return;
    try {
      const data = await apiClearLikes(sid);
      setItems(data.items);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const isLiked = useCallback(
    (productId: string) => items.some((p) => p.id === productId),
    [items]
  );

  const value = useMemo<LikesContextValue>(
    () => ({
      items,
      sessionId,
      loading,
      error,
      refreshLikes,
      addLike,
      removeLike,
      clearAll,
      isLiked,
    }),
    [items, sessionId, loading, error, refreshLikes, addLike, removeLike, clearAll, isLiked]
  );

  return (
    <LikesContext.Provider value={value}>{children}</LikesContext.Provider>
  );
}

export function useLikes(): LikesContextValue {
  const ctx = useContext(LikesContext);
  if (!ctx) throw new Error("useLikes must be used within LikesProvider");
  return ctx;
}
