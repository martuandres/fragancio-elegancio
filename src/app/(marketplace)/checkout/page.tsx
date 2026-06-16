"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Droplets } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Item = {
  cantidad: number;
  producto: {
    id_producto: number;
    nombre: string;
    marca: string;
    precio: number;
    concentracion: string | null;
  };
};

type CarritoData = { id_carrito: number | null; items: Item[]; total: number };

export default function CheckoutPage() {
  const [carrito, setCarrito] = useState<CarritoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/carrito")
      .then((r) => r.json())
      .then(setCarrito)
      .finally(() => setLoading(false));
  }, []);

  async function handleConfirmar() {
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Error al confirmar el pedido");
        return;
      }
      // Si el servidor devolvió un init_point de MercadoPago, redirigir allí
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        // Fallback: sin MP configurado, ir directo al pedido
        window.location.href = `/pedidos/${data.id_carrito}`;
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-stone-200 border-t-stone-800" />
      </div>
    );
  }

  const items = carrito?.items ?? [];
  const total = carrito?.total ?? 0;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Link href="/carrito" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Droplets className="size-5 text-stone-600" />
          <span className="font-semibold tracking-tight">Checkout</span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8 space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-stone-500">No hay productos en tu carrito.</p>
            <Link href="/catalogo" className={buttonVariants({ variant: "outline" })}>
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumen del pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item) => (
                  <div key={item.producto.id_producto} className="flex justify-between text-sm">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{item.producto.nombre}</span>
                      <span className="text-stone-400 ml-1.5">× {item.cantidad}</span>
                    </div>
                    <span className="shrink-0 font-medium ml-4">
                      ${(item.producto.precio * item.cantidad).toLocaleString("es-AR")}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span>${total.toLocaleString("es-AR")}</span>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-2.5 text-sm text-blue-700">
              Serás redirigido a MercadoPago para completar el pago de forma segura.
            </div>

            {error && (
              <p className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button className="w-full" disabled={confirming} onClick={handleConfirmar}>
              {confirming ? "Redirigiendo a MercadoPago…" : "Pagar con MercadoPago"}
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
