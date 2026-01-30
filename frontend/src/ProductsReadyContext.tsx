import { createContext, useContext } from "react";

/** True khi danh sách product đã load xong (thành công hoặc lỗi). Cart/Likes chỉ fetch và cho tương tác sau khi productsReady. */
const ProductsReadyContext = createContext<boolean>(false);

export function useProductsReady(): boolean {
  return useContext(ProductsReadyContext);
}

export { ProductsReadyContext };
