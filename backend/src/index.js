require("dotenv").config();
const express = require("express");
const path = require("path");
const productRouter = require("../services/product/router");

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(express.json());

app.get("/health", (req, res) => res.sendStatus(200));

// CORS — frontend (Vite 5173) gọi từ origin khác
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (CORS_ORIGIN && origin === CORS_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!CORS_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.sendStatus(204);
  }
  next();
});

// Phục vụ ảnh tại /assets
const assetsPath = path.join(__dirname, "..", "assets");
app.use("/assets", express.static(assetsPath));

// Ảnh upload từ admin (admin-server lưu vào backend/uploads)
const uploadsPath = path.join(__dirname, "..", "uploads");
app.use("/uploads", express.static(uploadsPath));

// API product + likes (Prisma + PostgreSQL). Cart, Checkout, Auth chạy service riêng (dev:cart, dev:checkout, dev:auth).
app.use("/api", productRouter);

app.listen(PORT, () => {
  console.log(`API chạy tại http://localhost:${PORT}`);
  console.log(`Ví dụ: GET http://localhost:${PORT}/api/products`);
});
