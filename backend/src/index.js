const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Phục vụ ảnh sản phẩm tại /assets
const assetsPath = path.join(__dirname, "..", "assets");
app.use("/assets", express.static(assetsPath));

const productsPath = path.join(__dirname, "..", "data", "seed", "products.json");
const categoriesPath = path.join(__dirname, "..", "data", "seed", "categories.json");
let products = [];
let categories = [];

function loadProducts() {
  const raw = fs.readFileSync(productsPath, "utf-8");
  products = JSON.parse(raw);
}

function loadCategories() {
  const raw = fs.readFileSync(categoriesPath, "utf-8");
  categories = JSON.parse(raw);
}

loadProducts();
loadCategories();

/** GET /api/products — trả về tất cả sản phẩm */
app.get("/api/products", (req, res) => {
  res.json(products);
});

/** GET /api/categories — trả về tất cả category */
app.get("/api/categories", (req, res) => {
  res.json(categories);
});

/** GET /api/products/:slug — trả về 1 sản phẩm theo slug */
app.get("/api/products/:slug", (req, res) => {
  const { slug } = req.params;
  const product = products.find((p) => p.slug === slug);

  if (!product) {
    return res.status(404).json({ error: "Product not found", slug });
  }

  res.json(product);
});

app.listen(PORT, () => {
  console.log(`API chạy tại http://localhost:${PORT}`);
  console.log(`Ví dụ: GET http://localhost:${PORT}/api/products/amongus`);
});
