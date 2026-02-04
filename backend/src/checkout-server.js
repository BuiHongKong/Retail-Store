require("dotenv").config();
const express = require("express");
const checkoutRouter = require("../services/checkout/router");

const app = express();
const PORT = process.env.CHECKOUT_PORT || 3002;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(express.json());

app.get("/health", (req, res) => res.sendStatus(200));

// CORS — frontend (Vite thường 5173) gọi từ origin khác
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (CORS_ORIGIN) {
    if (origin === CORS_ORIGIN) res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-cart-session, Authorization");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.sendStatus(204);
  }
  next();
});

// API checkout only (Prisma + PostgreSQL, cùng DB với backend chính)
app.use("/api", checkoutRouter);

app.listen(PORT, () => {
  console.log(`Checkout API chạy tại http://localhost:${PORT}`);
  console.log(`Ví dụ: GET http://localhost:${PORT}/api/checkout/preview`);
});
