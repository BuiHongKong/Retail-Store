const { PrismaClient } = require("@prisma/client");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();

const categoriesSeed = [
  { id: "cat-character", slug: "character", name: "Character", description: "Plush toys inspired by characters", sortOrder: 1 },
  { id: "cat-food", slug: "food", name: "Food", description: "Food-shaped plush toys", sortOrder: 2 },
  { id: "cat-animal", slug: "animal", name: "Animal", description: "Animal plush toys", sortOrder: 3 },
];

async function main() {
  const productsPath = path.join(__dirname, "..", "data", "seed", "products.json");
  const raw = fs.readFileSync(productsPath, "utf-8");
  const productsSeed = JSON.parse(raw);

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

  console.log("Seed done: categories + products");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
