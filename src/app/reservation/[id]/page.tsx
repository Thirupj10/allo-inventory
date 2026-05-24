"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";

type Reservation = {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: string;
  expiresAt: string;
};

type Product = { id: string; name: string; price: number };
type Warehouse = { id: string; name: string; location: string };

export default function ReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [status, setStatus] = useState<"pending" | "confirmed" | "released" | "expired">("pending");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    async function load() {
      const [resRes, prodRes, whRes] = await Promise.all([
        fetch(`/api/reservations/${id}`),
        fetch("/api/products"),
        fetch("/api/warehouses"),
      ]);

      const resData: Reservation = await resRes.json();
      const products: Product[] = await prodRes.json();
      const warehouses: Warehouse[] = await whRes.json();

      setReservation(resData);
      setProduct(products.find((p) => p.id === resData.productId) ?? null);
      setWarehouse(warehouses.find((w) => w.id === resData.warehouseId) ?? null);
      setStatus(resData.status as any);
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!reservation || status !== "pending") return;

    const interval = setInterval(() => {
      const remaining = Math.floor((new Date(reservation.expiresAt).getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        setTimeLeft(0);
        setStatus("expired");
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservation, status]);

  const handleConfirm = useCallback(async () => {
    setActing(true);
    setError(null);
    const res = await fetch(`/api/reservations/${id}/confirm`, { method: "POST" });

    if (res.status === 410) {
      setError("Your reservation expired before payment could be confirmed.");
      setStatus("expired");
    } else if (res.ok) {
      setStatus("confirmed");
      setMessage("Payment confirmed! Your order is placed.");
    } else {
      setError("Something went wrong. Please try again.");
    }
    setActing(false);
  }, [id]);

  const handleCancel = useCallback(async () => {
    setActing(true);
    setError(null);
    const res = await fetch(`/api/reservations/${id}/release`, { method: "POST" });

    if (res.ok) {
      setStatus("released");
      setMessage("Reservation cancelled. Stock has been released.");
    } else {
      setError("Something went wrong. Please try again.");
    }
    setActing(false);
  }, [id]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg">Loading reservation...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Checkout</h1>
        <p className="text-gray-500 text-sm mb-6">Reservation #{id.slice(-8)}</p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="font-semibold text-gray-900">{product?.name}</p>
          <p className="text-sm text-gray-500">{warehouse?.name} · {warehouse?.location}</p>
          <p className="text-indigo-600 font-bold text-lg mt-2">₹{product?.price}</p>
          <p className="text-sm text-gray-500">Qty: {reservation?.quantity}</p>
        </div>

        {status === "pending" && (
          <div className={`text-center mb-6 p-4 rounded-lg ${timeLeft < 60 ? "bg-red-50" : "bg-amber-50"}`}>
            <p className="text-sm text-gray-600 mb-1">Reserved for</p>
            <p className={`text-4xl font-mono font-bold ${timeLeft < 60 ? "text-red-600" : "text-amber-600"}`}>
              {formatTime(timeLeft)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Complete payment before time runs out</p>
          </div>
        )}

        {status === "expired" && (
          <div className="text-center mb-6 p-4 bg-red-50 rounded-lg">
            <p className="text-red-600 font-semibold">Reservation Expired</p>
            <p className="text-sm text-gray-500 mt-1">The hold has been released. Stock is available again.</p>
          </div>
        )}

        {status === "confirmed" && (
          <div className="text-center mb-6 p-4 bg-green-50 rounded-lg">
            <p className="text-green-600 font-semibold text-lg">Order Confirmed ✓</p>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
        )}

        {status === "released" && (
          <div className="text-center mb-6 p-4 bg-gray-100 rounded-lg">
            <p className="text-gray-600 font-semibold">Reservation Cancelled</p>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {status === "pending" && (
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={acting}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {acting ? "..." : "Cancel"}
            </button>
            <button
              onClick={handleConfirm}
              disabled={acting}
              className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {acting ? "Processing..." : "Confirm Purchase"}
            </button>
          </div>
        )}

        {(status === "confirmed" || status === "released" || status === "expired") && (
          <button
            onClick={() => router.push("/")}
            className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Back to Products
          </button>
        )}
      </div>
    </main>
  );
}