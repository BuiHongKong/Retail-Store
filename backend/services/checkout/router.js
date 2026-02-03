const express = require("express");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();
const SESSION_HEADER = "x-cart-session";
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

function getUserIdFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.id ?? null;
  } catch {
    return null;
  }
}

const cartInclude = {
  items: { include: { product: true } },
};

/** GET /checkout/preview — xem nhanh giỏ trước khi thanh toán (cùng DB, đọc cart theo session) */
router.get("/checkout/preview", async (req, res) => {
  try {
    const sessionId = req.headers[SESSION_HEADER] || null;
    if (!sessionId) {
      return res.status(400).json({ error: "X-Cart-Session header is required" });
    }
    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: cartInclude,
    });
    if (!cart || cart.items.length === 0) {
      return res.json({
        sessionId,
        items: [],
        total: 0,
        currency: "VND",
      });
    }
    const total = cart.items.reduce(
      (sum, i) => sum + i.product.price * i.quantity,
      0
    );
    const currency = cart.items[0]?.product?.currency ?? "VND";
    res.json({
      sessionId: cart.sessionId,
      items: cart.items.map((i) => ({
        productId: i.product.id,
        slug: i.product.slug,
        name: i.product.name,
        price: i.product.price,
        currency: i.product.currency,
        imageUrl: i.product.imageUrl,
        quantity: i.quantity,
      })),
      total,
      currency,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get checkout preview" });
  }
});

/** POST /checkout — thanh toán giả lập: tạo Order, OrderItem, xóa cart items */
router.post("/checkout", async (req, res) => {
  try {
    const sessionId = req.headers[SESSION_HEADER] || null;
    if (!sessionId) {
      return res.status(400).json({ error: "X-Cart-Session header is required" });
    }

    const body = req.body || {};
    const paymentMethod = body.paymentMethod ?? "cod";
    const shippingAddress = body.shippingAddress != null ? String(body.shippingAddress).trim() : "";
    const phone = body.phone != null ? String(body.phone).trim() : "";
    if (!shippingAddress) {
      return res.status(400).json({ error: "Địa chỉ giao hàng là bắt buộc" });
    }
    if (!phone) {
      return res.status(400).json({ error: "Số điện thoại là bắt buộc" });
    }
    // Form giả lập: không gọi payment thật, chỉ validate có cart và items
    if (paymentMethod === "card") {
      if (!body.cardHolder || typeof body.cardHolder !== "string" || body.cardHolder.trim() === "") {
        return res.status(400).json({ error: "cardHolder is required for card payment" });
      }
      // cardNumber, expiry, cvc optional cho giả lập
    }

    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: cartInclude,
    });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }
    if (cart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const total = cart.items.reduce(
      (sum, i) => sum + i.product.price * i.quantity,
      0
    );
    const currency = cart.items[0]?.product?.currency ?? "VND";
    const userId = getUserIdFromRequest(req);

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          sessionId,
          userId: userId || undefined,
          total,
          currency,
          paymentMethod: String(paymentMethod),
          shippingAddress,
          phone,
          status: "pending",
        },
      });
      await tx.orderItem.createMany({
        data: cart.items.map((i) => ({
          orderId: newOrder.id,
          productId: i.product.id,
          quantity: i.quantity,
          priceAtOrder: i.product.price,
        })),
      });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return newOrder;
    });

    res.status(201).json({
      success: true,
      orderId: order.id,
      message: "Đơn hàng đã được tạo (thanh toán giả lập).",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to checkout" });
  }
});

module.exports = router;
