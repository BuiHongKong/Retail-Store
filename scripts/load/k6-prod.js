/**
 * -----------------------------------------------------------------------------
 * GIẢ LẬP USER (LOAD TEST) — Production — Full flow
 * -----------------------------------------------------------------------------
 * Script k6 mô phỏng user: đăng ký → đăng nhập (token) → auth/me → categories
 * → products → chi tiết sản phẩm → giỏ hàng → thêm vào giỏ → checkout preview
 * → POST checkout (đặt hàng) → GET orders → likes (GET/POST/DELETE).
 * Tạo traffic để Prometheus thu thập metrics; xem trên Grafana.
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
    { duration: "3m", target: 6 },
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
  const likesSession = uuid();

  // --- 1. Register (app bắt buộc đăng ký mới dùng được)
  const email = uniqueEmail();
  let res = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({ email, password: REGISTER_PASSWORD, name: "Load Test User" }),
    { headers: { "Content-Type": "application/json" } }
  );
  const registerOk = check(res, {
    "register OK": (r) => r.status === 201 && r.json("token"),
  });
  if (!registerOk) {
    return;
  }
  sleep(0.2);

  // --- Login (tăng auth_logins_total)
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
    "X-Likes-Session": likesSession,
  };

  // --- 2. Auth/me (verify logged in)
  res = http.get(`${BASE_URL}/api/auth/me`, { headers });
  check(res, { "auth/me OK": (r) => r.status === 200 });
  sleep(0.2);

  // --- 3. Browse: categories → products → product detail
  res = http.get(`${BASE_URL}/api/categories`);
  check(res, { "categories OK": (r) => r.status === 200 });
  sleep(0.5);

  res = http.get(`${BASE_URL}/api/products`);
  check(res, { "products OK": (r) => r.status === 200 });
  sleep(0.3);

  const slug = randomItem(PRODUCT_SLUGS);
  res = http.get(`${BASE_URL}/api/products/${slug}`);
  check(res, (r) => r.status === 200 && r.json("slug"));
  const productId = res.json("id"); // UUID from DB — cart/likes API require this, not slug
  sleep(0.2);

  // --- 4. Cart: get cart → add item
  res = http.get(`${BASE_URL}/api/cart`, { headers });
  check(res, (r) => r.status === 200);
  sleep(0.2);

  res = http.post(
    `${BASE_URL}/api/cart/items`,
    JSON.stringify({ productId, quantity: 1 }),
    { headers }
  );
  check(res, (r) => r.status === 200 || r.status === 201);
  sleep(0.3);

  // --- 5. Checkout preview
  res = http.get(`${BASE_URL}/api/checkout/preview`, { headers });
  check(res, (r) => r.status === 200);
  sleep(0.3);

  // --- 6. POST checkout (đặt hàng — COD hoặc card để có metrics cả hai)
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

  // --- 7. Orders (lịch sử đơn hàng)
  res = http.get(`${BASE_URL}/api/orders`, { headers });
  check(res, (r) => r.status === 200);
  sleep(0.3);

  // --- 8. Likes
  res = http.get(`${BASE_URL}/api/likes`, { headers });
  check(res, (r) => r.status === 200);
  sleep(0.2);
  res = http.post(
    `${BASE_URL}/api/likes/items`,
    JSON.stringify({ productId }),
    { headers }
  );
  check(res, (r) => r.status === 200 || r.status === 201);
  sleep(0.5);
  res = http.del(`${BASE_URL}/api/likes/items/${productId}`, null, { headers });
  check(res, (r) => r.status === 200 || r.status === 204);
  sleep(1);
}
