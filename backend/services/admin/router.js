const bcrypt = require("bcrypt");
const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "admin-change-me-in-production";
const ADMIN_JWT_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || "8h";
const SALT_ROUNDS = 10;

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".bin";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

function createAdminToken(payload) {
  return jwt.sign(payload, ADMIN_JWT_SECRET, { expiresIn: ADMIN_JWT_EXPIRES_IN });
}

function verifyAdminToken(token) {
  return jwt.verify(token, ADMIN_JWT_SECRET);
}

function adminMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header required" });
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyAdminToken(token);
    req.admin = { id: payload.id, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function toUserResponse(user) {
  return { id: user.id, email: user.email, name: user.name ?? null };
}

const ORDER_STATUSES = ["pending", "confirmed", "shipping", "delivered", "cancelled", "completed"];

/** GET /admin/status — frontend biết admin service đang chạy */
router.get("/admin/status", (req, res) => {
  res.json({ enabled: true });
});

/** POST /admin/login — chỉ user role admin */
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || user.role !== "admin") {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = createAdminToken({ id: user.id, email: user.email });
    res.json({ token, user: toUserResponse(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

/** GET /admin/orders — danh sách đơn (phân trang) */
router.get("/admin/orders", adminMiddleware, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;
    const orders = await prisma.order.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

/** PATCH /admin/orders/:id — cập nhật trạng thái. Hoàn thành → xóa đơn (clear lịch sử khách) */
router.patch("/admin/orders/:id", adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status || typeof status !== "string") {
      return res.status(400).json({ error: "status is required" });
    }
    const normalized = status.toLowerCase().trim();
    if (!ORDER_STATUSES.includes(normalized)) {
      return res.status(400).json({ error: "Invalid status", allowed: ORDER_STATUSES });
    }
    if (normalized === "completed") {
      await prisma.order.delete({ where: { id } });
      return res.json({ deleted: true, id });
    }
    const order = await prisma.order.update({
      where: { id },
      data: { status: normalized },
    });
    res.json(order);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Order not found" });
    console.error(err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

/** GET /admin/categories */
router.get("/admin/categories", adminMiddleware, async (req, res) => {
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

/** POST /admin/categories */
router.post("/admin/categories", adminMiddleware, async (req, res) => {
  try {
    const { slug, name, description, sortOrder } = req.body || {};
    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      return res.status(400).json({ error: "slug is required" });
    }
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "name is required" });
    }
    const s = slug.trim().toLowerCase();
    const existing = await prisma.category.findUnique({ where: { slug: s } });
    if (existing) return res.status(409).json({ error: "Slug already exists" });
    const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
    const category = await prisma.category.create({
      data: {
        id,
        slug: s,
        name: name.trim(),
        description: description != null && String(description).trim() !== "" ? String(description).trim() : null,
        sortOrder: Number(sortOrder) || 0,
      },
    });
    res.status(201).json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

/** PATCH /admin/categories/:id */
router.patch("/admin/categories/:id", adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const data = {};
    if (body.name != null && String(body.name).trim() !== "") data.name = String(body.name).trim();
    if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null;
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;
    const category = await prisma.category.update({
      where: { id },
      data,
    });
    res.json(category);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Category not found" });
    console.error(err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

/** GET /admin/products */
router.get("/admin/products", adminMiddleware, async (req, res) => {
  try {
    const categoryId = req.query.categoryId;
    const where = categoryId ? { categoryId: String(categoryId) } : {};
    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: "asc" },
    });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/** POST /admin/products */
router.post("/admin/products", adminMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const name = body.name != null ? String(body.name).trim() : "";
    const slug = body.slug != null ? String(body.slug).trim().toLowerCase() : "";
    const categoryId = body.categoryId;
    const price = Number(body.price);
    const currency = body.currency || "VND";
    const imageUrl = body.imageUrl != null ? String(body.imageUrl).trim() : "";
    const rating = Number(body.rating) || 0;
    const ratingCount = Number(body.ratingCount) || 0;
    const stock = Number(body.stock) || 0;
    if (!name) return res.status(400).json({ error: "name is required" });
    if (!slug) return res.status(400).json({ error: "slug is required" });
    if (!categoryId) return res.status(400).json({ error: "categoryId is required" });
    if (Number.isNaN(price) || price < 0) return res.status(400).json({ error: "price must be a non-negative number" });
    if (!imageUrl) return res.status(400).json({ error: "imageUrl is required" });
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) return res.status(409).json({ error: "Slug already exists" });
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) return res.status(400).json({ error: "Category not found" });
    const id = `prod-${crypto.randomUUID().slice(0, 8)}`;
    const product = await prisma.product.create({
      data: {
        id,
        slug,
        name,
        description: body.description ? String(body.description).trim() : null,
        categoryId,
        price: Math.round(price),
        currency,
        imageUrl,
        rating,
        ratingCount,
        stock,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

/** PATCH /admin/products/:id */
router.patch("/admin/products/:id", adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const data = {};
    if (body.name != null && String(body.name).trim() !== "") data.name = String(body.name).trim();
    if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null;
    if (body.slug != null && String(body.slug).trim() !== "") data.slug = String(body.slug).trim().toLowerCase();
    if (body.categoryId != null) data.categoryId = String(body.categoryId);
    if (body.price !== undefined) data.price = Math.round(Number(body.price)) || 0;
    if (body.currency != null) data.currency = String(body.currency);
    if (body.imageUrl != null) data.imageUrl = String(body.imageUrl).trim();
    if (body.rating !== undefined) data.rating = Number(body.rating) || 0;
    if (body.ratingCount !== undefined) data.ratingCount = Number(body.ratingCount) || 0;
    if (body.stock !== undefined) data.stock = Number(body.stock) || 0;
    const product = await prisma.product.update({
      where: { id },
      data,
    });
    res.json(product);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Product not found" });
    if (err.code === "P2002") return res.status(409).json({ error: "Slug already exists" });
    console.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

/** DELETE /admin/products/:id */
router.delete("/admin/products/:id", adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Product not found" });
    if (err.code === "P2003") return res.status(409).json({ error: "Không thể xóa: sản phẩm đã có trong đơn hàng" });
    console.error(err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

/** POST /admin/upload — multipart, 1 file */
router.post("/admin/upload", adminMiddleware, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

module.exports = router;
