require("dotenv").config();
const express = require("express");
const path = require("path");
const productRouter = require("../services/product/router");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Phục vụ ảnh tại /assets
const assetsPath = path.join(__dirname, "..", "assets");
app.use("/assets", express.static(assetsPath));

// API product + likes (Prisma + PostgreSQL). Cart chạy service riêng.
app.use("/api", productRouter);

app.listen(PORT, () => {
  console.log(`API chạy tại http://localhost:${PORT}`);
  console.log(`Ví dụ: GET http://localhost:${PORT}/api/products`);
});
