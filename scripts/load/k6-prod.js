/**
 * k6 load script — simulates user traffic for Grafana (prod) metrics.
 * Run: k6 run scripts/load/k6-prod.js
 * With base URL: k6 run -e BASE_URL=https://your-prod-url scripts/load/k6-prod.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5173";

const PRODUCT_SLUGS = ["amongus", "baby", "frog", "breakfast", "cat", "dog"];

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
  const headers = {
    "Content-Type": "application/json",
    "x-cart-session": cartSession,
    "X-Likes-Session": likesSession,
  };

  // Flow 1: Browse + cart + checkout preview (guest)
  let res = http.get(`${BASE_URL}/api/categories`);
  check(res, { "categories OK": (r) => r.status === 200 });
  sleep(0.5);

  res = http.get(`${BASE_URL}/api/products`);
  check(res, { "products OK": (r) => r.status === 200 });
  sleep(0.3);

  const slug = randomItem(PRODUCT_SLUGS);
  res = http.get(`${BASE_URL}/api/products/${slug}`);
  check(res, (r) => r.status === 200 && r.json("slug"));
  sleep(0.2);

  res = http.get(`${BASE_URL}/api/cart`, { headers });
  check(res, (r) => r.status === 200);
  sleep(0.2);

  res = http.post(
    `${BASE_URL}/api/cart/items`,
    JSON.stringify({ productId: `prod-${slug}`, quantity: 1 }),
    { headers }
  );
  check(res, (r) => r.status === 200 || r.status === 201);
  sleep(0.3);

  res = http.get(`${BASE_URL}/api/checkout/preview`, { headers });
  check(res, (r) => r.status === 200);
  sleep(0.5);

  // Flow 2: Likes
  res = http.get(`${BASE_URL}/api/likes`, { headers });
  check(res, (r) => r.status === 200);
  sleep(0.2);
  res = http.post(
    `${BASE_URL}/api/likes/items`,
    JSON.stringify({ productId: `prod-${slug}` }),
    { headers }
  );
  check(res, (r) => r.status === 200 || r.status === 201);
  sleep(0.5);
  res = http.del(`${BASE_URL}/api/likes/items/prod-${slug}`, null, { headers });
  check(res, (r) => r.status === 200 || r.status === 204);
  sleep(1);
}
