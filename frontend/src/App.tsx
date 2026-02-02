import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { CartProvider } from "./cart/CartContext";
import { LikesProvider } from "./likes/LikesContext";
import { ProductsReadyContext } from "./ProductsReadyContext";
import { Layout } from "./pages/Layout";
import { HomePage } from "./pages/Home";
import { CheckoutPage } from "./pages/Checkout";
import "./App.css";

function App() {
  const [productsReady, setProductsReady] = useState(true);

  return (
    <ProductsReadyContext.Provider value={productsReady}>
      <CartProvider>
        <LikesProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage onReadyChange={setProductsReady} />} />
              <Route path="checkout" element={<CheckoutPage />} />
            </Route>
          </Routes>
        </LikesProvider>
      </CartProvider>
    </ProductsReadyContext.Provider>
  );
}

export default App;
