import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { AdminProvider } from "./admin/AdminContext";
import { CartProvider } from "./cart/CartContext";
import { LikesProvider } from "./likes/LikesContext";
import { ProductsReadyContext } from "./ProductsReadyContext";
import { Layout } from "./pages/Layout";
import { HomePage } from "./pages/Home";
import { CheckoutPage } from "./pages/Checkout";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";
import { OrdersPage } from "./pages/Orders";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminLoginPage } from "./pages/admin/AdminLogin";
import { AdminOrdersPage } from "./pages/admin/AdminOrders";
import { AdminProductsPage } from "./pages/admin/AdminProducts";
import { AdminCategoriesPage } from "./pages/admin/AdminCategories";
import "./App.css";

function App() {
  const [productsReady, setProductsReady] = useState(true);

  return (
    <AuthProvider>
      <AdminProvider>
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
                <Route path="admin" element={<AdminLayout />}>
                  <Route index element={<AdminOrdersPage />} />
                  <Route path="login" element={<AdminLoginPage />} />
                  <Route path="products" element={<AdminProductsPage />} />
                  <Route path="categories" element={<AdminCategoriesPage />} />
                </Route>
              </Routes>
            </LikesProvider>
          </CartProvider>
        </ProductsReadyContext.Provider>
      </AdminProvider>
    </AuthProvider>
  );
}

export default App;
