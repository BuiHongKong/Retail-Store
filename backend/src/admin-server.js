require("dotenv").config();
const express = require("express");
const adminRouter = require("../services/admin/router");

const app = express();
const PORT = process.env.ADMIN_PORT || 3004;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(express.json());

app.get("/health", (req, res) => res.sendStatus(200));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (CORS_ORIGIN) {
    if (origin === CORS_ORIGIN) res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.sendStatus(204);
  }
  next();
});

app.use("/api", adminRouter);

app.listen(PORT, () => {
  console.log(`Admin API chạy tại http://localhost:${PORT}`);
  console.log(`Ví dụ: GET http://localhost:${PORT}/api/admin/status`);
});
