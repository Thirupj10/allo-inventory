import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { productId, warehouseId, quantity } = parsed.data;

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      const stocks = await tx.$queryRaw`
        SELECT id, "totalUnits", "reservedUnits"
        FROM "Stock"
        WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
        FOR UPDATE
      `;

      const stockList = stocks as { id: string; totalUnits: number; reservedUnits: number }[];

      if (!stockList.length) {
        throw new Error("STOCK_NOT_FOUND");
      }

      const stock = stockList[0];
      const available = stock.totalUnits - stock.reservedUnits;

      if (available < quantity) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      await tx.stock.update({
        where: {
          productId_warehouseId: { productId, warehouseId },
        },
        data: { reservedUnits: { increment: quantity } },
      });

      return await tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: "pending",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (err: any) {
    console.error("RESERVATION ERROR:", err);
    if (err.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json({ error: "Not enough stock available" }, { status: 409 });
    }
    if (err.message === "STOCK_NOT_FOUND") {
      return NextResponse.json({ error: "Stock record not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
