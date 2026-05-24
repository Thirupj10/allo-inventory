import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create warehouses
  const mumbai = await prisma.warehouse.create({
    data: { name: "Mumbai Central", location: "Mumbai, MH" },
  });
  const delhi = await prisma.warehouse.create({
    data: { name: "Delhi North", location: "Delhi, DL" },
  });

  // Create products with stock per warehouse
  const products = [
    { name: "Testosterone Support Kit", description: "Clinically formulated supplement pack", price: 1499 },
    { name: "Sleep & Recovery Bundle", description: "Melatonin + magnesium night stack", price: 999 },
    { name: "Men's Wellness Starter Pack", description: "Complete 30-day wellness kit", price: 2199 },
    { name: "Energy Boost Formula", description: "Pre-workout + adaptogens blend", price: 799 },
  ];

  for (const p of products) {
    const product = await prisma.product.create({ data: p });

    await prisma.stock.createMany({
      data: [
        { productId: product.id, warehouseId: mumbai.id, totalUnits: 10, reservedUnits: 0 },
        { productId: product.id, warehouseId: delhi.id, totalUnits: 5, reservedUnits: 0 },
      ],
    });
  }

  console.log("✅ Seed complete");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());