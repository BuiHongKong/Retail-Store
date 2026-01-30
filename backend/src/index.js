require("dotenv").config();
const express = require("express");
const path = require("path");
const productRouter = require("../services/product/router");
const cartRouter = require("../services/cart/router");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Phục vụ ảnh tại /assets
const assetsPath = path.join(__dirname, "..", "assets");
app.use("/assets", express.static(assetsPath));

// API product (Prisma + PostgreSQL)
app.use("/api", productRouter);
// API cart (giỏ hàng theo session)
app.use("/api", cartRouter);

app.listen(PORT, () => {
  console.log(`API chạy tại http://localhost:${PORT}`);
  console.log(`Ví dụ: GET http://localhost:${PORT}/api/products`);
});
