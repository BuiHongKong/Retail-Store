import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { CartProvider } from "./cart/CartContext";
import { LikesProvider } from "./likes/LikesContext";
import { ProductsReadyContext } from "./ProductsReadyContext";
import { Layout } from "./pages/Layout";
import { HomePage } from "./pages/Home";
import { CheckoutPage } from "./pages/Checkout";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";
import { OrdersPage } from "./pages/Orders";
import "./App.css";

function App() {
  const [productsReady, setProductsReady] = useState(true);

  return (
    <AuthProvider>
      <ProductsReadyContext.Provider value={productsReady}>
        <CartProvider>
          <LikesProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<HomePage onReadyChange={setProductsReady} />} />
                <Route path="checkout" element={<CheckoutPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="orders" element={<OrdersPage />} />
              </Route>
            </Routes>
          </LikesProvider>
        </CartProvider>
      </ProductsReadyContext.Provider>
    </AuthProvider>
  );
}

export default App;
