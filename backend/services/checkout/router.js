const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();
const SESSION_HEADER = "x-cart-session";

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
    const shippingAddress = body.shippingAddress ?? null;
    const phone = body.phone ?? null;
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

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          sessionId,
          total,
          currency,
          paymentMethod: String(paymentMethod),
          shippingAddress: shippingAddress ? String(shippingAddress).trim() || null : null,
          phone: phone ? String(phone).trim() || null : null,
          status: "completed",
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
