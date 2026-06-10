"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock, Droplets } from "lucide-react";
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

type PagoResult = {
  id_pago: string;
  id_carrito: number;
  importe_total: number;
  estado: string;
  reservacion_minutos: number;
};

export default function CheckoutPage() {
  const [carrito, setCarrito] = useState<CarritoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [pago, setPago] = useState<PagoResult | null>(null);
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
      if (res.ok) {
        setPago(data);
      } else {
        setError(data.message ?? "Error al confirmar el pedido");
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

  if (pago) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <CheckCircle className="size-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-stone-800">¡Pedido registrado!</h1>
          <p className="text-stone-500 text-sm">
            Tu pedido fue creado y está pendiente de confirmación de pago.
          </p>
          <Card className="bg-white text-left">
            <CardContent className="p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">N° de pedido</span>
                <span className="font-mono font-medium">#{pago.id_carrito}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Total</span>
                <span className="font-bold">
                  ${pago.importe_total.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-stone-500">Estado</span>
                <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                  <Clock className="size-3" /> Pendiente de pago
                </span>
              </div>
            </CardContent>
          </Card>
          <Link
            href={`/pedidos/${pago.id_carrito}`}
            className={cn(buttonVariants(), "w-full justify-center")}
          >
            Ver mi pedido
          </Link>
        </div>
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

            {error && (
              <p className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button className="w-full" disabled={confirming} onClick={handleConfirmar}>
              {confirming ? "Procesando…" : "Confirmar pedido"}
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
