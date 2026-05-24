"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Warehouse = { id: string; name: string; location: string };
type Stock = { warehouseId: string; totalUnits: number; reservedUnits: number; warehouse: Warehouse };
type Product = { id: string; name: string; description: string; price: number; stocks: Stock[] };

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => { setProducts(data); setLoading(false); });
  }, []);

  async function handleReserve(productId: string, warehouseId: string) {
    setReserving(`${productId}-${warehouseId}`);
    setError(null);

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
    });

    const data = await res.json();

    if (res.status === 409) {
      setError("Not enough stock available. Someone else may have just reserved the last unit.");
      setReserving(null);
      return;
    }

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      setReserving(null);
      return;
    }

    router.push(`/reservation/${data.id}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg">Loading products...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Allo Health Store</h1>
        <p className="text-gray-500 mb-8">Reserve your products before checkout</p>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{product.name}</h2>
                  <p className="text-gray-500 text-sm mt-1">{product.description}</p>
                </div>
                <span className="text-2xl font-bold text-indigo-600">₹{product.price}</span>
              </div>

              <div className="space-y-3">
                {product.stocks.map((stock) => {
                  const available = stock.totalUnits - stock.reservedUnits;
                  const key = `${product.id}-${stock.warehouseId}`;
                  const isReserving = reserving === key;

                  return (
                    <div
                      key={stock.warehouseId}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{stock.warehouse.name}</p>
                        <p className="text-sm text-gray-500">{stock.warehouse.location}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`text-sm font-medium ${available > 0 ? "text-green-600" : "text-red-500"}`}>
                          {available > 0 ? `${available} available` : "Out of stock"}
                        </span>

                        <button
                          onClick={() => handleReserve(product.id, stock.warehouseId)}
                          disabled={available === 0 || isReserving}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium
                            hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          {isReserving ? "Reserving..." : "Reserve"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}