const crypto = require("crypto");
const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();
const SESSION_HEADER = "x-cart-session";

/** Lấy hoặc tạo cart theo sessionId */
async function getOrCreateCart(sessionId) {
  if (sessionId) {
    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: {
        items: { include: { product: true } },
      },
    });
    if (cart) return cart;
  }
  const newSessionId = crypto.randomUUID();
  return prisma.cart.create({
    data: { sessionId: newSessionId },
    include: {
      items: { include: { product: true } },
    },
  });
}

/** Chuyển cart + items sang dạng response { sessionId, items: [...] } */
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
    const cart = await getOrCreateCart(sessionId);
    const { productId, quantity = 1 } = req.body || {};
    if (!productId || typeof productId !== "string") {
      return res.status(400).json({ error: "productId is required" });
    }
    const qty = Math.max(1, Number(quantity) || 1);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: "Product not found", productId });
    }

    const existing = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: { cartId: cart.id, productId },
      },
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + qty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity: qty,
        },
      });
    }

    const updated = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: true } } },
    });
    res.json(toCartResponse(updated));
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
    const qty = Math.max(0, Number(quantity) ?? 0);

    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const item = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: { cartId: cart.id, productId },
      },
    });
    if (!item) {
      return res.status(404).json({ error: "Cart item not found", productId });
    }

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
      include: { items: { include: { product: true } } },
    });
    res.json(toCartResponse(updated));
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
    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    const updated = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: true } } },
    });
    res.json(toCartResponse(updated));
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

    const cart = await prisma.cart.findUnique({
      where: { sessionId },
    });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const item = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: { cartId: cart.id, productId },
      },
    });
    if (!item) {
      return res.status(404).json({ error: "Cart item not found", productId });
    }

    await prisma.cartItem.delete({ where: { id: item.id } });

    const updated = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: true } } },
    });
    res.json(toCartResponse(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove cart item" });
  }
});

module.exports = router;
