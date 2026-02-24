const bcrypt = require("bcrypt");
const express = require("express");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { authLoginsTotal } = require("../metrics");

const prisma = new PrismaClient();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const SALT_ROUNDS = 10;

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header required" });
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

const ALLOWED_LOCALES = ["vi", "en"];

function toUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    preferredLocale: user.preferredLocale ?? null,
  };
}

/** GET /auth/status — frontend gọi để biết auth service đang chạy (bật bắt buộc đăng nhập) */
router.get("/auth/status", (req, res) => {
  res.json({ enabled: true });
});

/** POST /auth/register */
router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || typeof email !== "string" || email.trim() === "") {
      return res.status(400).json({ error: "email is required" });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "password must be at least 6 characters" });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name != null && String(name).trim() !== "" ? String(name).trim() : null,
      },
    });
    const token = createToken({ id: user.id, email: user.email });
    res.status(201).json({ token, user: toUserResponse(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

/** POST /auth/login */
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const normalizedEmail = email.trim().toLowerCase();
    console.log("[AUTH] login attempt email=" + normalizedEmail);
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      console.log("[AUTH] login result=invalid (user not found)");
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      console.log("[AUTH] login result=invalid (wrong password)");
      return res.status(401).json({ error: "Invalid email or password" });
    }
    console.log("[AUTH] login result=success id=" + user.id);
    authLoginsTotal.inc();
    const token = createToken({ id: user.id, email: user.email });
    res.json({ token, user: toUserResponse(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

/** GET /auth/me — requires Authorization Bearer */
router.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(toUserResponse(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get user" });
  }
});

/** PATCH /auth/me — update profile (e.g. preferredLocale) */
router.patch("/auth/me", authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const data = {};
    if (body.preferredLocale !== undefined) {
      const locale = typeof body.preferredLocale === "string" ? body.preferredLocale.trim().toLowerCase() : "";
      if (locale && !ALLOWED_LOCALES.includes(locale)) {
        return res.status(400).json({ error: "preferredLocale must be vi or en" });
      }
      data.preferredLocale = locale || null;
    }
    if (Object.keys(data).length === 0) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json(toUserResponse(user));
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
    });
    res.json(toUserResponse(user));
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "User not found" });
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

/** GET /orders — purchase history, requires Authorization Bearer */
router.get("/orders", authMiddleware, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

module.exports = router;
