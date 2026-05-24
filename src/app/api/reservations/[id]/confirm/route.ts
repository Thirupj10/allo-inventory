import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }
  if (reservation.status !== "pending") {
    return NextResponse.json({ error: "Reservation is not pending" }, { status: 400 });
  }
  if (new Date() > reservation.expiresAt) {
    return NextResponse.json({ error: "Reservation has expired" }, { status: 410 });
  }

  await prisma.$transaction([
    prisma.stock.update({
      where: {
        productId_warehouseId: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
      },
      data: {
        totalUnits: { decrement: reservation.quantity },
        reservedUnits: { decrement: reservation.quantity },
      },
    }),
    prisma.reservation.update({
      where: { id },
      data: { status: "confirmed" },
    }),
  ]);

  return NextResponse.json({ message: "Reservation confirmed" });
}