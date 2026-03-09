/**
 * -----------------------------------------------------------------------------
 * GIẢ LẬP USER (LOAD TEST) — Production — Flow rút gọn
 * -----------------------------------------------------------------------------
 * Flow: đăng ký → đăng nhập → chi tiết 1 sản phẩm → giỏ hàng → thêm vào giỏ
 * → POST checkout (đặt hàng). Đủ để tạo auth_logins_total + checkout_payments_total.
 *
 * Chạy local:  k6 run -e BASE_URL=http://<prod-alb> scripts/load/k6-prod.js
 * GitHub:      workflow Load test (prod) dùng secret PROD_URL. Xem MONITORING.md.
 * -----------------------------------------------------------------------------
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5173";

const PRODUCT_SLUGS = ["amongus", "baby", "frog", "breakfast", "cat", "dog"];
const REGISTER_PASSWORD = "password123";

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Unique email per VU/iteration to avoid "Email already registered" */
function uniqueEmail() {
  return `loadtest-vu${__VU}-iter${__ITER}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export const options = {
  stages: [
    { duration: "1m", target: 2 },
    { duration: "2m", target: 4 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<3000"],
  },
};

export default function () {
  const cartSession = uuid();

  // --- 1. Register
  const email = uniqueEmail();
  let res = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({ email, password: REGISTER_PASSWORD, name: "Load Test User" }),
    { headers: { "Content-Type": "application/json" } }
  );
  const registerOk = check(res, {
    "register OK": (r) => r.status === 201 && r.json("token"),
  });
  if (!registerOk) return;
  sleep(0.2);

  // --- 2. Login (tăng auth_logins_total)
  res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password: REGISTER_PASSWORD }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(res, { "login OK": (r) => r.status === 200 && r.json("token") });
  const token = res.json("token");
  sleep(0.3);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "x-cart-session": cartSession,
  };

  // --- 3. Product detail (lấy productId)
  const slug = randomItem(PRODUCT_SLUGS);
  res = http.get(`${BASE_URL}/api/products/${slug}`);
  const productOk = check(res, (r) => r.status === 200 && r.json("slug"));
  if (!productOk) return;
  const productId = res.json("id");
  if (!productId) return;
  sleep(0.2);

  // --- 4. Get cart → add item
  res = http.get(`${BASE_URL}/api/cart`, { headers });
  check(res, (r) => r.status === 200);
  sleep(0.2);

  res = http.post(
    `${BASE_URL}/api/cart/items`,
    JSON.stringify({ productId, quantity: 1 }),
    { headers }
  );
  const addCartOk = check(res, (r) => r.status === 200 || r.status === 201);
  if (!addCartOk) return;
  sleep(0.3);

  // --- 5. POST checkout (đặt hàng — COD hoặc card)
  const useCard = Math.random() < 0.5;
  const checkoutBody = {
    paymentMethod: useCard ? "card" : "cod",
    shippingAddress: "123 Load Test Street, District 1",
    phone: "0900000000",
  };
  if (useCard) checkoutBody.cardHolder = "Load Test User";
  res = http.post(
    `${BASE_URL}/api/checkout`,
    JSON.stringify(checkoutBody),
    { headers }
  );
  check(res, (r) => r.status === 201 && r.json("success"));
  sleep(0.5);
}
