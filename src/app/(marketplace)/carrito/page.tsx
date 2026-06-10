"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Droplets, ShoppingBag, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Item = {
  cantidad: number;
  producto: {
    id_producto: number;
    nombre: string;
    marca: string;
    stock: number;
    precio: number;
    concentracion: string | null;
  };
};

type CarritoData = {
  id_carrito: number | null;
  items: Item[];
  total: number;
};

export default function CarritoPage() {
  const [data, setData] = useState<CarritoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const fetchCarrito = useCallback(async () => {
    const res = await fetch("/api/carrito");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchCarrito(); }, [fetchCarrito]);

  async function handleRemove(id_producto: number) {
    setRemovingId(id_producto);
    await fetch("/api/carrito", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_producto }),
    });
    await fetchCarrito();
    setRemovingId(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-stone-200 border-t-stone-800" />
      </div>
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Link href="/catalogo" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Droplets className="size-5 text-stone-600" />
          <span className="font-semibold tracking-tight">Carrito</span>
        </div>
        <span className="text-sm text-stone-500">
          {items.length} {items.length === 1 ? "producto" : "productos"}
        </span>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <ShoppingBag className="size-12 text-stone-300" />
            <h2 className="text-xl font-semibold text-stone-700">Tu carrito está vacío</h2>
            <p className="text-sm text-stone-500">
              Explorá el catálogo y agregá tus fragancias favoritas.
            </p>
            <Link href="/catalogo" className={buttonVariants({ variant: "outline" })}>
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item.producto.id_producto} className="bg-white">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase tracking-wider text-stone-500">
                        {item.producto.marca}
                      </p>
                      <p className="font-semibold text-stone-800 truncate">
                        {item.producto.nombre}
                      </p>
                      {item.producto.concentracion && (
                        <p className="text-xs text-stone-400">{item.producto.concentracion}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-stone-800">
                        ${(item.producto.precio * item.cantidad).toLocaleString("es-AR")}
                      </p>
                      <p className="text-xs text-stone-400">
                        ${item.producto.precio.toLocaleString("es-AR")} × {item.cantidad}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(item.producto.id_producto)}
                      disabled={removingId === item.producto.id_producto}
                      className="shrink-0 text-stone-400 hover:text-red-500 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-white">
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-stone-700 font-medium">Total</span>
                <span className="text-xl font-bold text-stone-800">
                  ${total.toLocaleString("es-AR")}
                </span>
              </CardContent>
            </Card>

            <Link href="/checkout" className={cn(buttonVariants(), "w-full justify-center")}>
              Ir al checkout →
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
