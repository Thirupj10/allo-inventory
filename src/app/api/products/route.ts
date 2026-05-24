import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Lazy expiry cleanup — release expired pending reservations
  await prisma.$transaction(async (tx) => {
    const expired = await tx.reservation.findMany({
      where: {
        status: "pending",
        expiresAt: { lt: new Date() },
      },
    });

    for (const r of expired) {
      await tx.stock.update({
        where: {
          productId_warehouseId: {
            productId: r.productId,
            warehouseId: r.warehouseId,
          },
        },
        data: { reservedUnits: { decrement: r.quantity } },
      });

      await tx.reservation.update({
        where: { id: r.id },
        data: { status: "released" },
      });
    }
  });

  // Return products with stock per warehouse
  const products = await prisma.product.findMany({
    include: {
      stocks: {
        include: { warehouse: true },
      },
    },
  });

  return NextResponse.json(products);
}