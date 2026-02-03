require("dotenv").config();
const express = require("express");
const authRouter = require("../services/auth/router");

const app = express();
const PORT = process.env.AUTH_PORT || 3003;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(express.json());

// CORS — frontend (Vite 5173) gọi từ origin khác
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (CORS_ORIGIN) {
    if (origin === CORS_ORIGIN) res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
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

// API auth + orders (Prisma + PostgreSQL, cùng DB với backend chính)
app.use("/api", authRouter);

app.listen(PORT, () => {
  console.log(`Auth API chạy tại http://localhost:${PORT}`);
  console.log(`Ví dụ: GET http://localhost:${PORT}/api/auth/status`);
});
