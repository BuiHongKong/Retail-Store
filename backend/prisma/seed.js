const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();
const DEFAULT_USER_EMAIL = "demo@example.com";
const DEFAULT_USER_PASSWORD = "demo123";
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "admin123";
const SALT_ROUNDS = 10;

const categoriesSeed = [
  { id: "cat-character", slug: "character", name: "Character", description: "Plush toys inspired by characters", sortOrder: 1 },
  { id: "cat-food", slug: "food", name: "Food", description: "Food-shaped plush toys", sortOrder: 2 },
  { id: "cat-animal", slug: "animal", name: "Animal", description: "Animal plush toys", sortOrder: 3 },
];

async function main() {
  console.log("[SEED] START");
  const productCount = await prisma.product.count();
  if (productCount > 0) {
    console.log("[SEED] SKIPPED (products already exist, count=" + productCount + ")");
    return;
  }

  const productsPath = path.join(__dirname, "..", "data", "seed", "products.json");
  const raw = fs.readFileSync(productsPath, "utf-8");
  const productsSeed = JSON.parse(raw);

  // Xóa theo thứ tự phụ thuộc (FK)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.like.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  for (const c of categoriesSeed) {
    await prisma.category.create({ data: c });
  }

  for (const p of productsSeed) {
    await prisma.product.create({
      data: {
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description ?? null,
        categoryId: p.categoryId,
        price: p.price,
        currency: p.currency,
        imageUrl: p.imageUrl,
        rating: p.rating,
        ratingCount: p.ratingCount,
        stock: p.stock,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      },
    });
  }

  // User mặc định để dùng thử (khi bật auth service)
  const existingUser = await prisma.user.findUnique({ where: { email: DEFAULT_USER_EMAIL } });
  if (!existingUser) {
    const passwordHash = await bcrypt.hash(DEFAULT_USER_PASSWORD, SALT_ROUNDS);
    await prisma.user.create({
      data: {
        email: DEFAULT_USER_EMAIL,
        passwordHash,
        name: "Demo User",
        role: "user",
      },
    });
    console.log(`User mặc định đã tạo: ${DEFAULT_USER_EMAIL} / ${DEFAULT_USER_PASSWORD}`);
  }

  // Admin mặc định (khi bật admin service)
  const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!existingAdmin) {
    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash: adminHash,
        name: "Admin",
        role: "admin",
      },
    });
    console.log(`Admin mặc định đã tạo: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  }

  const userCount = await prisma.user.count();
  console.log("[SEED] COMPLETED categories=3 products=" + productsSeed.length + " users=" + userCount + " (demo@example.com, admin@example.com)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
