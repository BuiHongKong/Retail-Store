const crypto = require("crypto");
const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();
const SESSION_HEADER = "x-cart-session";

const cartInclude = {
  items: { include: { product: true } },
};

async function getOrCreateCart(sessionId) {
  if (sessionId) {
    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: cartInclude,
    });
    if (cart) return cart;
  }
  const newSessionId = crypto.randomUUID();
  return prisma.cart.create({
    data: { sessionId: newSessionId },
    include: cartInclude,
  });
}

function toCartResponse(cart) {
  return {
    sessionId: cart.sessionId,
    items: cart.items.map((item) => ({
      productId: item.product.id,
      slug: item.product.slug,
      name: item.product.name,
      price: item.product.price,
      currency: item.product.currency,
      imageUrl: item.product.imageUrl,
      quantity: item.quantity,
    })),
  };
}

async function addItem(sessionId, productId, quantity) {
  const cart = await getOrCreateCart(sessionId);
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return null;

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });
  const qty = Math.max(1, Number(quantity) || 1);
  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + qty },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity: qty },
    });
  }
  const updated = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: cartInclude,
  });
  return toCartResponse(updated);
}

async function updateItemQuantity(sessionId, productId, quantity) {
  const cart = await prisma.cart.findUnique({
    where: { sessionId },
    include: { items: true },
  });
  if (!cart) return null;
  const item = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });
  if (!item) return null;
  const qty = Math.max(0, Number(quantity) ?? 0);
  if (qty === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: qty },
    });
  }
  const updated = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: cartInclude,
  });
  return toCartResponse(updated);
}

async function removeItem(sessionId, productId) {
  const cart = await prisma.cart.findUnique({ where: { sessionId } });
  if (!cart) return null;
  const item = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });
  if (!item) return null;
  await prisma.cartItem.delete({ where: { id: item.id } });
  const updated = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: cartInclude,
  });
  return toCartResponse(updated);
}

async function clearCart(sessionId) {
  const cart = await prisma.cart.findUnique({
    where: { sessionId },
    include: { items: true },
  });
  if (!cart) return null;
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  const updated = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: cartInclude,
  });
  return toCartResponse(updated);
}

// ——— Routes ———

/** GET /cart — lấy giỏ hàng (tạo mới nếu chưa có session) */
router.get("/cart", async (req, res) => {
  try {
    const sessionId = req.headers[SESSION_HEADER] || null;
    const cart = await getOrCreateCart(sessionId);
    res.json(toCartResponse(cart));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get cart" });
  }
});

/** POST /cart/items — thêm sản phẩm vào giỏ (body: productId, quantity?) */
router.post("/cart/items", async (req, res) => {
  try {
    const sessionId = req.headers[SESSION_HEADER] || null;
    const { productId, quantity = 1 } = req.body || {};
    if (!productId || typeof productId !== "string") {
      return res.status(400).json({ error: "productId is required" });
    }
    const result = await addItem(sessionId, productId, quantity);
    if (result === null) {
      return res.status(404).json({ error: "Product not found", productId });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add cart item" });
  }
});

/** PATCH /cart/items/:productId — cập nhật số lượng (body: quantity) */
router.patch("/cart/items/:productId", async (req, res) => {
  try {
    const sessionId = req.headers[SESSION_HEADER];
    if (!sessionId) {
      return res.status(400).json({ error: "X-Cart-Session header is required" });
    }
    const { productId } = req.params;
    const { quantity } = req.body || {};
    const result = await updateItemQuantity(sessionId, productId, quantity);
    if (result === null) {
      return res.status(404).json({ error: "Cart or cart item not found", productId });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update cart item" });
  }
});

/** DELETE /cart/items — xóa toàn bộ sản phẩm trong giỏ */
router.delete("/cart/items", async (req, res) => {
  try {
    const sessionId = req.headers[SESSION_HEADER];
    if (!sessionId) {
      return res.status(400).json({ error: "X-Cart-Session header is required" });
    }
    const result = await clearCart(sessionId);
    if (result === null) {
      return res.status(404).json({ error: "Cart not found" });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

/** DELETE /cart/items/:productId — xóa sản phẩm khỏi giỏ */
router.delete("/cart/items/:productId", async (req, res) => {
  try {
    const sessionId = req.headers[SESSION_HEADER];
    if (!sessionId) {
      return res.status(400).json({ error: "X-Cart-Session header is required" });
    }
    const { productId } = req.params;
    const result = await removeItem(sessionId, productId);
    if (result === null) {
      return res.status(404).json({ error: "Cart or cart item not found", productId });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove cart item" });
  }
});

module.exports = router;
