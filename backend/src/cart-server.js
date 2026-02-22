require("dotenv").config();
const express = require("express");
const cartRouter = require("../services/cart/router");
const metrics = require("../services/metrics");

const app = express();
const PORT = process.env.CART_PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(express.json());
app.use(metrics.middleware);

app.get("/health", (req, res) => res.sendStatus(200));
app.get("/metrics", metrics.handler);

// CORS — frontend (Vite thường 5173) gọi từ origin khác
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (CORS_ORIGIN) {
    if (origin === CORS_ORIGIN) res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-cart-session");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.sendStatus(204);
  }
  next();
});

// API cart only (Prisma + PostgreSQL, cùng DB với backend chính)
app.use("/api", cartRouter);

app.listen(PORT, () => {
  console.log(`Cart API chạy tại http://localhost:${PORT}`);
  console.log(`Ví dụ: GET http://localhost:${PORT}/api/cart`);
});
