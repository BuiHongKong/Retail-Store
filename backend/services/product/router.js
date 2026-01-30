const crypto = require("crypto");
const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();
const LIKES_SESSION_HEADER = "x-likes-session";

/** GET /products — trả về tất cả sản phẩm */
router.get("/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/** GET /categories — trả về tất cả category */
router.get("/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
    });
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

/** GET /products/:slug — trả về 1 sản phẩm theo slug */
router.get("/products/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    const product = await prisma.product.findUnique({
      where: { slug },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found", slug });
    }
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// ——— Likes (sản phẩm đã thích theo session) ———

async function getLikesBySession(sessionId) {
  if (!sessionId) return [];
  const likes = await prisma.like.findMany({
    where: { sessionId },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });
  return likes.map((l) => l.product);
}

function toLikesResponse(sessionId, products) {
  return { sessionId: sessionId || null, items: products };
}

/** GET /likes — danh sách đã thích; không header thì trả sessionId mới + items rỗng */
router.get("/likes", async (req, res) => {
  try {
    const sessionId = req.headers[LIKES_SESSION_HEADER] || null;
    if (sessionId) {
      const items = await getLikesBySession(sessionId);
      return res.json(toLikesResponse(sessionId, items));
    }
    res.json(toLikesResponse(crypto.randomUUID(), []));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get likes" });
  }
});

/** POST /likes/items — thêm like (body: productId). Thiếu session thì tạo mới */
router.post("/likes/items", async (req, res) => {
  try {
    let sessionId = req.headers[LIKES_SESSION_HEADER] || null;
    const { productId } = req.body || {};
    if (!productId || typeof productId !== "string") {
      return res.status(400).json({ error: "productId is required" });
    }
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: "Product not found", productId });
    }
    if (!sessionId) sessionId = crypto.randomUUID();
    await prisma.like.upsert({
      where: { sessionId_productId: { sessionId, productId } },
      create: { sessionId, productId },
      update: {},
    });
    const items = await getLikesBySession(sessionId);
    res.json(toLikesResponse(sessionId, items));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add like" });
  }
});

/** DELETE /likes/items — xóa toàn bộ like trong session */
router.delete("/likes/items", async (req, res) => {
  try {
    const sessionId = req.headers[LIKES_SESSION_HEADER];
    if (!sessionId) {
      return res.status(400).json({ error: "X-Likes-Session header is required" });
    }
    await prisma.like.deleteMany({ where: { sessionId } });
    res.json(toLikesResponse(sessionId, []));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to clear likes" });
  }
});

/** DELETE /likes/items/:productId — bỏ like */
router.delete("/likes/items/:productId", async (req, res) => {
  try {
    const sessionId = req.headers[LIKES_SESSION_HEADER];
    if (!sessionId) {
      return res.status(400).json({ error: "X-Likes-Session header is required" });
    }
    const { productId } = req.params;
    await prisma.like.deleteMany({ where: { sessionId, productId } });
    const items = await getLikesBySession(sessionId);
    res.json(toLikesResponse(sessionId, items));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove like" });
  }
});

module.exports = router;
